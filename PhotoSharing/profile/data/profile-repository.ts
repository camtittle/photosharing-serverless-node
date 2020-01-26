import {ProfileDetails} from "../domain/profile-details";
import {DynamoDbService} from "../../shared/dynamodb/dynamo-db-service";

export class ProfileRepository {

    private static readonly tableName = 'profilesTable';

    public static async updateProfile(profileDetails: ProfileDetails) {
        const dynamoDbService = DynamoDbService.getInstance();
        await dynamoDbService.put(this.tableName, profileDetails);
    }

}
