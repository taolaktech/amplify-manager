import { Types } from "mongoose";


export interface AdPlatformInterface<T = unknown> {
    platformName: string;

    pauseCamapign(campaignId: string | Types.ObjectId): Promise<void>;

    resumeCampaign(campaignId: string | Types.ObjectId): Promise<void>;

    getCampaignData(campaignId: string | Types.ObjectId): Promise<T>;

    getPlatformSpecificData?(): Promise<any>;
}