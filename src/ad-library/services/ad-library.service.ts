import { BadRequestException, Injectable } from '@nestjs/common';
import { MetaAdLibraryApiService } from './meta-ad-library-api.service';
import { MetaAdReachedCountry } from '../types/meta-ad-library.types';
import { ShopifyService } from 'src/shopify/shopify.service';

@Injectable()
export class AdLibraryService {
  private static storeProfileCache = new Map<
    string,
    {
      expiresAt: number;
      profile: {
        shopId: string;
        keywords: string[];
        niche?: string;
        avgPriceUsd?: number;
      };
    }
  >();

  constructor(
    private readonly metaAdLibraryApi: MetaAdLibraryApiService,
    private readonly shopifyService: ShopifyService,
  ) {}

  private normalizeKeyword(token: string) {
    return token
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractKeywords(texts: string[], max = 20) {
    const stop = new Set([
      'the',
      'and',
      'for',
      'with',
      'your',
      'you',
      'our',
      'from',
      'into',
      'onto',
      'this',
      'that',
      'are',
      'was',
      'were',
      'a',
      'an',
      'to',
      'in',
      'on',
      'of',
      'by',
      'at',
      'as',
    ]);

    const counts = new Map<string, number>();
    for (const t of texts) {
      const norm = this.normalizeKeyword(t);
      if (!norm) continue;
      for (const word of norm.split(' ')) {
        if (word.length < 3) continue;
        if (stop.has(word)) continue;
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([w]) => w);
  }

  private parseCsv(value?: string) {
    if (!value) return [];
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  scoreAd(ad: any) {
    void ad;
    return Math.floor(Math.random() * 101);
  }

  async getTopCompetitorAds(params: {
    nicheId: string;
    limit: number;
    timeWindow: '7d' | '30d' | '90d';
    adReachedCountries?: MetaAdReachedCountry[];
  }) {
    const { nicheId, limit, timeWindow } = params;

    if (!nicheId) {
      throw new BadRequestException('niche_id is required');
    }

    const raw = await this.metaAdLibraryApi.getAdsArchive({
      search_terms: nicheId,
      ad_reached_countries: params.adReachedCountries ?? (['US'] as const),
      limit,
    });

    return raw;
  }

  async getCompetitorAdRecommendations(params: {
    shopId: string;
    limit: number;
    cursor?: string;
    productIds?: string;
    collectionId?: string;
    priceBand?: string;
    keywords?: string;
  }): Promise<{
    items: any[];
    next_cursor?: string;
    match_summary?: string;
  }> {
    const { shopId, limit, cursor, collectionId, priceBand } = params;

    if (!shopId) {
      throw new BadRequestException('shop_id is required');
    }

    const cappedLimit = Math.max(1, Math.min(limit ?? 25, 50));

    const cacheKey = `shop:${shopId}`;
    const cached = AdLibraryService.storeProfileCache.get(cacheKey);

    let storeProfile = cached?.profile;
    const now = Date.now();
    if (!storeProfile || (cached && cached.expiresAt <= now)) {
      const productsRes = await this.shopifyService.getShopifyProductsByShopId(
        shopId,
        { first: 30 },
      );

      const nodes = productsRes?.products?.edges?.map((e) => e.node) ?? [];
      const requestedProductIds = new Set(this.parseCsv(params.productIds));
      const filteredNodes = requestedProductIds.size
        ? nodes.filter((n) => requestedProductIds.has(n.id))
        : nodes;

      const texts: string[] = [];
      for (const n of filteredNodes) {
        if (n?.title) texts.push(n.title);
        if (n?.productType) texts.push(n.productType);
        if (n?.vendor) texts.push(n.vendor);
        if (n?.category?.name) texts.push(n.category.name);
        if (Array.isArray(n?.tags)) {
          for (const tag of n.tags) {
            if (typeof tag === 'string') texts.push(tag);
          }
        }
      }

      const extracted = this.extractKeywords(texts, 25);
      storeProfile = {
        shopId,
        keywords: extracted,
      };

      AdLibraryService.storeProfileCache.set(cacheKey, {
        expiresAt: now + 10 * 60 * 1000,
        profile: storeProfile,
      });
    }

    const explicitKeywords = this.parseCsv(params.keywords);
    const baseKeywords = explicitKeywords.length
      ? explicitKeywords
      : storeProfile.keywords;

    const filterHints: string[] = [];
    if (collectionId) filterHints.push(`collection ${collectionId}`);
    if (priceBand) filterHints.push(`price band ${priceBand}`);

    const keywordClusters = [
      baseKeywords.slice(0, 2).join(' '),
      baseKeywords.slice(2, 4).join(' '),
    ].filter(Boolean);

    const chosenQuery = keywordClusters[0] || baseKeywords[0] || shopId;

    const raw = await this.metaAdLibraryApi.getAdsArchive({
      search_terms: chosenQuery,
      ad_reached_countries: ['US'],
      limit: cappedLimit,
      after: cursor,
    });

    const rawItems: any[] =
      (raw && (raw.data ?? raw?.ads ?? raw?.results ?? raw?.items)) ?? [];

    const keywordsForScoring = new Set(
      baseKeywords.slice(0, 10).map((k) => this.normalizeKeyword(k)),
    );

    const scored = rawItems.map((a) => {
      const text = `${a?.ad_creative_body ?? a?.body ?? a?.text ?? ''} ${a?.page_name ?? ''}`;
      const hay = this.normalizeKeyword(text);
      let score = 0;
      let matched: string[] = [];
      for (const k of keywordsForScoring) {
        if (!k) continue;
        if (hay.includes(k)) {
          score += 1;
          matched.push(k);
        }
      }

      const topMatch = matched[0];
      const matchReason = topMatch
        ? `matches your: ${topMatch}${filterHints.length ? ` (${filterHints.join(', ')})` : ''}`
        : `matches your store signals${filterHints.length ? ` (${filterHints.join(', ')})` : ''}`;

      const adScore = this.scoreAd(a);

      return {
        ad_id: a?.ad_archive_id ?? a?.id ?? a?.ad_id,
        page_id: a?.page_id ?? a?.pageId,
        page_name: a?.page_name ?? a?.pageName,
        ad_snapshot_url: a?.ad_snapshot_url ?? a?.adSnapshotUrl,
        start_date: a?.ad_delivery_start_time ?? a?.start_date ?? a?.startDate,
        end_date: a?.ad_delivery_stop_time ?? a?.end_date ?? a?.endDate,
        score_total: a?.score_total ?? a?.scoreTotal,
        score: adScore,
        match_reason: matchReason,
        _rank: adScore,
      };
    });

    scored.sort((a, b) => {
      if (b._rank !== a._rank) return b._rank - a._rank;
      const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
      const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
      return bDate - aDate;
    });

    const items = scored.slice(0, cappedLimit).map(({ _rank, ...rest }) => rest);

    const nextCursor =
      raw?.paging?.cursors?.after ?? raw?.next_cursor ?? raw?.cursor ?? undefined;

    return {
      items,
      next_cursor: nextCursor,
      match_summary: chosenQuery,
    };
  }

  health() {
    return { status: 'ok' };
  }
}
