export function getQueueUrlForPlatform(platform: string): string {
  const env = process.env.NODE_ENV || 'development'; // 'production' or 'development'
  const suffix = env === 'production' ? '' : 'dev-';

  const queueName = `${suffix}${platform}-campaign-queue`;

  // construct the full URL based on region and account ID from config
  const region = process.env.AWS_REGION;
  const accountId = process.env.AWS_ACCOUNT_ID;

  return `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;
}
