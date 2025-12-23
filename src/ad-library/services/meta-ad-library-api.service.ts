import { BadRequestException, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { AppConfigService } from 'src/config/config.service';
import {
  MetaAdReachedCountry,
  MetaAdsArchiveResponse,
} from '../types/meta-ad-library.types';

@Injectable()
export class MetaAdLibraryApiService {
  constructor(private readonly config: AppConfigService) {}

  private adLibraryAxios(): AxiosInstance {
    const accessToken = this.config.get('META_AD_LIBRARY_ACCESS_TOKEN');

    return axios.create({
      baseURL: 'https://graph.facebook.com/v24.0',
      params: {
        access_token: accessToken,
      },
    });
  }

  async getAdsArchive(params: {
    fields?: string;
    search_terms?: string;
    ad_reached_countries: MetaAdReachedCountry[];
    search_page_ids?: string;
    ad_active_status?: string;
    limit?: number;
    after?: string;
  }): Promise<MetaAdsArchiveResponse> {
    if (!params.ad_reached_countries?.length) {
      throw new BadRequestException(
        'ad_reached_countries must include at least one country',
      );
    }
    const client = this.adLibraryAxios();
    
    const res = await client.get<MetaAdsArchiveResponse>('/ads_archive', {
      params: {
        ...params,
        ad_reached_countries: params.ad_reached_countries.join(','),
      },
    });

    return res.data;
  }

  health() {
    return { status: 'ok' };
  }
}
