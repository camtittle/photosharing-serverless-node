import S3 from 'aws-sdk/clients/s3';
import {PutObjectRequest} from "aws-sdk/clients/s3";
import { v4 as uuidv4 } from 'uuid';

export class S3Service {

    private static instance: S3Service;

    private s3Client: S3;

    // In future this should come from environment/settings
    private bucketName = 'photosharing-uploads-dev';

    private constructor() {
        this.s3Client = new S3({
            region: process.env.AWS_REGION,
        });
    }

    public static getInstance(): S3Service {
        if (!S3Service.instance) {
            S3Service.instance = new S3Service();
        }

        return S3Service.instance;
    }

    // Upload a base64 encoded image to S3 on behalf of a user
    // Returns the location URL of the uploaded file
    public async uploadImage(userId: string, base64Image: string): Promise<string> {
        const {type, buffer} = this.parseBase64Data(base64Image);

        const params = <PutObjectRequest>{
            Bucket: this.bucketName,
            Key: `${this.generateS3Key(userId)}.${type}`,
            Body: buffer,
            ACL: 'public-read',
            ContentEncoding: 'base64',
            ContentType: `image/${type}`
        };

        try {
            const result = await this.s3Client.upload(params).promise();

            console.log(result.Location, result.Key);
            return result.Location;
        } catch (err) {
            console.error(err);
            throw new Error('Error uploading to S3:');
        }
    }

    private parseBase64Data(base64Data: string): {type: string, buffer: Buffer} {
        try {
            const rawData = base64Data.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(rawData, 'base64');
            const type = base64Data.split(';')[0].split('/')[1];

            return {type, buffer};
        } catch {
            throw new Error('Error parsing base64 data');
        }
    }

    // Get the key to use when uploading a file for a particular user
    private generateS3Key(userId: string) {
        return userId + '/' + uuidv4();
    }


}
