import {ProfileDetails} from "../domain/profile-details";
import {DynamoDbService} from "../../shared/dynamodb/dynamo-db-service";
import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";
import BatchGetItemInput = DocumentClient.BatchGetItemInput;

export class ProfileRepository {

    private static readonly tableName = 'profilesTable';

    public static async updateProfile(profileDetails: ProfileDetails) {
        const dynamoDbService = DynamoDbService.getInstance();
        await dynamoDbService.put(this.tableName, profileDetails);
    }

    public static async getProfiles(ids: string[]): Promise<ProfilesByUserId> {
        const dynamoDbService = DynamoDbService.getInstance();

        const keys = ids.map(id => ({userId: id}));
        const result = await dynamoDbService.batchGet<ProfileDetails>(this.tableName, keys);

        const usernames: ProfilesByUserId = {};
        result.forEach(u => usernames[u.userId] = u);
        return usernames;
    }
}

export type ProfilesByUserId = {[userId: string]: ProfileDetails};
