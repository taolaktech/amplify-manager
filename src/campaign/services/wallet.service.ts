import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InternalHttpHelper } from '../../common/helpers/internal-http.helper';

interface ISubscriptionDetailsResponse {
  data: {
    planTier: 'free' | 'starter' | 'grow' | 'scale';
    campaignLimit: number;
  };
  message: string;
  success: boolean;
}

interface IWalletDebitResponse {
  data: {
    transactionId: string;
    remainingBalance: number;
  };
  message: string;
  success: boolean;
}

@Injectable()
export class AmplifyWalletService {
  private readonly logger = new Logger(AmplifyWalletService.name);
  constructor(private internalHttpHelper: InternalHttpHelper) {}

  async getSubscriptionDetails(userId: string) {
    try {
      // Make a request to the wallet service to get the user's subscription details
      const response = await this.internalHttpHelper
        .forService('amplify-wallet')
        .get<ISubscriptionDetailsResponse>(
          `/api/internal/subscription/subscription-details/${userId}`,
        );

      return response.data;
    } catch (error) {
      this.logger.error(
        `::: Error fetching subscription plan for user => ${userId}`,
      );
      throw error;
    }
  }

  async debitForCampaign(payload: {
    userId: string;
    amountInCents: number;
    idempotencyKey: string;
  }) {
    try {
      // make a request to wallet service to debit the user's wallet
      const response = await this.internalHttpHelper
        .forService('amplify-wallet')
        .post<IWalletDebitResponse>(
          `/api/internal/wallet/debit-for-campaign`,
          {
            userId: payload.userId,
            amountInCents: payload.amountInCents,
          },
          {
            headers: {
              'idempotency-key': payload.idempotencyKey,
            },
          },
        );

      if (response.success) {
        return response;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      this.logger.error(`::: Error debiting for campaign => ${error}`);

      // The InternalHttpHelper throws a generic Error.
      // Its message property contains the original service's error response stringified.
      if (error instanceof Error) {
        const errorMessage = error.message;
        const responsePrefix = 'Response: ';
        const responseIndex = errorMessage.indexOf(responsePrefix);

        // Check if the error message contains the "Response: " prefix, indicating
        // it's an error from an internal HTTP call.
        if (responseIndex !== -1) {
          // Extract the JSON string from the error message
          const jsonString = errorMessage.substring(
            responseIndex + responsePrefix.length,
          );

          let parsedErrorResponse;
          try {
            // Parse the JSON string to access the original error object from the wallet service
            parsedErrorResponse = JSON.parse(jsonString);
          } catch (jsonParseError) {
            // Log a warning if the JSON parsing fails, but proceed to re-throw the original error
            this.logger.warn(
              `Failed to parse JSON from error message: ${jsonParseError}`,
            );
            throw error;
          }

          console.log(
            `::: parse error message ${parsedErrorResponse} json string => ${jsonString} `,
          );

          // Check if the parsed response has the 'code' property and if it matches 'INSUFFICIENT_FUNDS'
          if (
            parsedErrorResponse &&
            parsedErrorResponse.code === 'INSUFFICIENT_FUNDS'
          ) {
            // If it's an insufficient funds error, throw a 402 Payment Required exception
            throw new HttpException(
              {
                message:
                  'Payment Required: Insufficient wallet balance or wallet inactive.',
                code: 'E_PAYMENT_REQUIRED', // You can define a custom error code for your API
              },
              HttpStatus.PAYMENT_REQUIRED, // 402 status code
            );
          } else {
            throw new HttpException(
              {
                message: parsedErrorResponse?.message ?? 'Something went wrong',
              },
              parsedErrorResponse.statusCode ?? HttpStatus.BAD_REQUEST,
            );
          }
        }
      }
      // Re-throw the original error if it's not the specific case we're looking for,
      // or if it's not an Error instance that could be parsed (e.g., network error, etc.).
      // throw error;
    }
  }
}
