import { AxiosError } from 'axios';
import { processCampaign } from './campaign-processor.js';
import type { SQSEvent } from 'aws-lambda';
import dotenv from 'dotenv';
dotenv.config();

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const rec of event.Records) {
    let campaignId = '';
    try {
      campaignId = JSON.parse(rec.body).campaignId;

      if (!campaignId) throw new Error('No campaignId provided');

      // statusTracking.status = GoogleAdsProcessingStatus.INITIALIZING;
      await processCampaign(campaignId);
      console.log(`\nCOMPLETED SUCCESSFULLY for- ${campaignId}`);
    } catch (err) {
      if (campaignId) {
        // saveProcessingStatus(campaignId, GoogleAdsProcessingStatus.FAILED)
        //   .then(() => undefined)
        //   .catch(() => {
        //     console.error('Unable to save processing status');
        //   });
      }

      console.log({ BODY: JSON.stringify(event.Records) });
      console.error('ERROR PROCESSING RECORD...');
      if (err instanceof Error) {
        console.error(err.message);
      }
      if (err instanceof AxiosError) {
        console.log('\n');
        console.error(JSON.stringify({ err: err.response?.data }));
        console.log('\n');
        console.error(err.response?.data);
      }
      throw new Error('Failed to process record');
    }
  }
};
