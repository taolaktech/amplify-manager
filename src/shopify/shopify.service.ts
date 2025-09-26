import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BusinessDoc, ShopifyAccountDoc } from 'src/database/schema';
import axios, { AxiosError } from 'axios';
import { AppConfigService } from 'src/config/config.service';
import { ErrorCode } from 'src/enums';
import { GetShopifyAuthUrlDto } from './dto';
import {
  GetShopifyOrdersQuery,
  GetShopifyOrdersResponse,
  GetShopifyProductByIdResponse,
  GetShopifyProductsQuery,
  GetShopifyProductsResponse,
} from './types';
import { DateTime } from 'luxon';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  constructor(
    private configService: AppConfigService,
    @InjectModel('shopify-accounts')
    private shopifyAccountModel: Model<ShopifyAccountDoc>,
    @InjectModel('business')
    private businessModel: Model<BusinessDoc>,
  ) {}

  private integrationsAxiosInstance() {
    const axiosInstance = axios.create({
      baseURL: `${this.configService.get('INTEGRATION_API_URL')}/api/shopify`,
      headers: {
        'x-api-key': this.configService.get('INTEGRATION_API_KEY'),
      },
    });

    return axiosInstance;
  }

  private async getShopifyConnectionUrlCall(
    userId: string,
    params: { shop: string; redirect?: string },
  ) {
    try {
      const res = await this.integrationsAxiosInstance().post<{ url: string }>(
        '/auth/url',
        {
          ...params,
          userId,
        },
      );
      return res.data.url;
    } catch (error: unknown) {
      this.logger.error('::: Unable to retrieve shopify auth url :::');
      if (error instanceof AxiosError) {
        console.log(
          error?.response?.data || error?.message || error?.response || error,
        );
      }
      throw new InternalServerErrorException(ErrorCode.INTERNAL_SERVER_ERROR);
    }
  }

  private async getProductsCall(
    params: {
      shop: string;
      accessToken: string;
      scope: string;
    },
    query?: GetShopifyProductsQuery,
  ) {
    try {
      const first = query?.first ?? '';
      const after = query?.after ?? '';
      const last = query?.last ?? '';
      const before = query?.before ?? '';
      const url = `/products?first=${first}&after=${after}&last=${last}&before=${before}`;

      const axios = this.integrationsAxiosInstance();

      const res = await axios.post<GetShopifyProductsResponse>(url, {
        shop: params.shop,
        accessToken: params.accessToken,
        scope: params.scope,
      });
      return res.data;
    } catch (error: unknown) {
      this.logger.error(
        `::: Unable to retrieve shopify products url params- ${JSON.stringify(params)} :::`,
      );
      if (error instanceof AxiosError) {
        this.logger.error(error.response);
        throw new BadRequestException(error.response?.data);
      }
      throw new InternalServerErrorException(ErrorCode.INTERNAL_SERVER_ERROR);
    }
  }

  private async getProductByIdCall(params: {
    shop: string;
    accessToken: string;
    scope: string;
    productId?: string;
    handle?: string;
  }) {
    try {
      const url = `/products/product-by-id`;

      if (!params.productId && !params.handle) {
        throw new BadRequestException(
          `productId or product handle must be present`,
        );
      }

      const res =
        await this.integrationsAxiosInstance().post<GetShopifyProductByIdResponse>(
          url,
          params,
        );
      return res.data;
    } catch (error: unknown) {
      this.logger.error(
        `::: Unable to retrieve shopify product by id or handle- ${JSON.stringify(params)} :::`,
      );
      if (error instanceof AxiosError) {
        console.log(error.response);
        throw new InternalServerErrorException(error.response?.data);
      }
      throw new InternalServerErrorException(ErrorCode.INTERNAL_SERVER_ERROR);
    }
  }

  private async getOrdersCall(
    params: {
      shop: string;
      accessToken: string;
      scope: string;
    },
    query?: GetShopifyOrdersQuery,
  ) {
    try {
      const first = query?.first ?? '';
      const after = query?.after ?? '';
      const last = query?.last ?? '';
      const before = query?.before ?? '';
      const searchQuery = query?.query ?? '';
      const url = `/orders?first=${first}&after=${after}&last=${last}&before=${before}&query=${searchQuery}`;

      const axios = this.integrationsAxiosInstance();

      const res = await axios.post<GetShopifyOrdersResponse>(url, {
        shop: params.shop,
        accessToken: params.accessToken,
        scope: params.scope,
      });
      return res.data;
    } catch (error: unknown) {
      this.logger.error(
        `::: Unable to retrieve shopify orders- ${JSON.stringify(params)} :::`,
      );
      if (error instanceof AxiosError) {
        this.logger.error(error.response);
        throw new InternalServerErrorException(error.response?.data);
      }
      throw new InternalServerErrorException(ErrorCode.INTERNAL_SERVER_ERROR);
    }
  }

  async getShopifyProducts(
    userId: Types.ObjectId,
    query: GetShopifyProductsQuery,
  ) {
    const business = await this.businessModel.findOne({ userId });

    if (!business) {
      throw new NotFoundException(`no business found for this user`);
    }

    if (!business.integrations?.shopify?.shopifyAccount) {
      throw new BadRequestException('No shopify account linked yet');
    }

    const shopifyAccount = await this.shopifyAccountModel.findById(
      business.integrations.shopify.shopifyAccount,
    );

    if (!shopifyAccount) {
      throw new BadRequestException(ErrorCode.SHOPIFY_ACCOUNT_NOT_FOUND);
    }

    const productsRes = await this.getProductsCall(
      {
        shop: shopifyAccount.shop,
        accessToken: shopifyAccount.accessToken,
        scope: shopifyAccount.scope,
      },
      query,
    );

    return productsRes;
  }

  async getShopifyAccountConnectionUrl(
    userId: Types.ObjectId,
    dto: GetShopifyAuthUrlDto,
  ) {
    const url = await this.getShopifyConnectionUrlCall(userId.toString(), dto);

    return url;
  }

  async getShopifyProductById(userId: Types.ObjectId, productId: string) {
    const business = await this.businessModel.findOne({ userId });

    if (!business) {
      throw new NotFoundException(`not business found for this user`);
    }

    if (!business.integrations?.shopify?.shopifyAccount) {
      throw new BadRequestException('No shopify account linked yet');
    }

    const shopifyAccount = await this.shopifyAccountModel.findById(
      business.integrations.shopify.shopifyAccount,
    );

    if (!shopifyAccount) {
      throw new BadRequestException(ErrorCode.SHOPIFY_ACCOUNT_NOT_FOUND);
    }

    const productRes = await this.getProductByIdCall({
      shop: shopifyAccount.shop,
      accessToken: shopifyAccount.accessToken,
      scope: shopifyAccount.scope,
      productId,
    });

    return productRes;
  }

  private async getShopifyOrders(
    businessId: Types.ObjectId,
    query: GetShopifyOrdersQuery,
  ) {
    const business = await this.businessModel.findById(businessId);

    if (!business) {
      throw new NotFoundException(`no business found for this user`);
    }

    if (!business.integrations?.shopify?.shopifyAccount) {
      throw new BadRequestException('No shopify account linked yet');
    }

    const shopifyAccount = await this.shopifyAccountModel.findById(
      business.integrations.shopify.shopifyAccount,
    );

    if (!shopifyAccount) {
      throw new BadRequestException(ErrorCode.SHOPIFY_ACCOUNT_NOT_FOUND);
    }

    const ordersRes = await this.getOrdersCall(
      {
        shop: shopifyAccount.shop,
        accessToken: shopifyAccount.accessToken,
        scope: shopifyAccount.scope,
      },
      query,
    );

    return ordersRes;
  }

  async calculateAOV(userId: Types.ObjectId) {
    const business = await this.businessModel.findOne({ userId });

    if (!business) {
      throw new NotFoundException(`no business found for this user`);
    }
    const oneMonthAgo = DateTime.now()
      .minus({ months: 1 })
      .toISODate()
      .split('T')[0];
    let totalOrders = 0;
    let totalRevenue = 0;
    let hasNextPage = false;
    let endCursor = '';
    let currency = 'USD';

    do {
      const ordersRes = await this.getShopifyOrders(business._id, {
        first: 20,
        after: endCursor,
        query: `financial_status:paid created_at:>=${oneMonthAgo}`,
      });

      totalRevenue += ordersRes.orders.edges.reduce((acc, orderEdge) => {
        return acc + parseFloat(orderEdge.node.totalPriceSet.shopMoney.amount);
      }, 0);
      totalOrders += ordersRes.orders.edges.length;
      hasNextPage = ordersRes.orders.pageInfo.hasNextPage;
      endCursor = ordersRes.orders.pageInfo.endCursor;
      currency =
        ordersRes.orders.edges[0]?.node.totalPriceSet.shopMoney.currencyCode;
    } while (hasNextPage);

    const aov = totalOrders
      ? totalRevenue / totalOrders
      : await this.calculateAverageProductPrice(business._id);

    if (currency === 'CAD') {
      return aov * 0.73; // convert to USD
    }

    return aov;
  }

  private async calculateAverageProductPrice(businessId: Types.ObjectId) {
    const business = await this.businessModel.findById(businessId);

    if (!business) {
      throw new NotFoundException(`no business found for this user`);
    }

    if (!business.integrations?.shopify?.shopifyAccount) {
      throw new BadRequestException('No shopify account linked yet');
    }

    const shopifyAccount = await this.shopifyAccountModel.findById(
      business.integrations.shopify.shopifyAccount,
    );

    if (!shopifyAccount) {
      throw new BadRequestException(ErrorCode.SHOPIFY_ACCOUNT_NOT_FOUND);
    }

    const productsRes = await this.getProductsCall(
      {
        shop: shopifyAccount.shop,
        accessToken: shopifyAccount.accessToken,
        scope: shopifyAccount.scope,
      },
      { first: 30 },
    );

    let currency = 'USD';

    const totalProductPrice = productsRes.products.edges.reduce((acc, edge) => {
      acc += Number(edge.node.priceRangeV2.minVariantPrice.amount);
      currency = edge.node.priceRangeV2.minVariantPrice.currencyCode;

      return acc;
    }, 0);

    if (!productsRes.products.edges.length) {
      throw new BadRequestException(
        'No products found in connected shopify store',
      );
    }

    const avProductPrice =
      totalProductPrice / productsRes.products.edges.length;

    if (currency === 'CAD') {
      return avProductPrice * 0.73; // converting to USD
    }

    return avProductPrice;
  }

  async getShopifyAccountProductById(
    shopifyAccountId: Types.ObjectId,
    shopifyProductId: string,
  ) {
    const shopifyAccount =
      await this.shopifyAccountModel.findById(shopifyAccountId);

    if (!shopifyAccount) {
      throw new BadRequestException(ErrorCode.SHOPIFY_ACCOUNT_NOT_FOUND);
    }

    const productRes = await this.getProductByIdCall({
      shop: shopifyAccount.shop,
      accessToken: shopifyAccount.accessToken,
      scope: shopifyAccount.scope,
      productId: shopifyProductId,
    });

    return productRes;
  }

  async getConnectedAccount(userId: Types.ObjectId) {
    const business = await this.businessModel.findOne({ userId });

    if (!business || !business?.integrations?.shopify?.shopifyAccount) {
      throw new NotFoundException(`No shopify account linked yet`);
    }

    const account = await this.shopifyAccountModel.findById(
      business?.integrations?.shopify?.shopifyAccount,
    );

    return account
      ? { ...account.toObject(), accessToken: undefined, scope: undefined }
      : null;
  }
}
