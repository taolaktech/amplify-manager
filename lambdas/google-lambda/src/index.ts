import { AxiosError } from 'axios';
import { processCampaign } from './campaign-processor.js';

export const handler = async (event: any) => {
  for (const rec of event.Records) {
    try {
      const campaignId = JSON.parse(rec.body).campaignId;

      if (!campaignId) throw new Error('No campaignId provided');
      await processCampaign(campaignId);
      console.log(`\nCOMPLETED SUCCESSFULLY for- ${campaignId}`);
    } catch (err) {
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
