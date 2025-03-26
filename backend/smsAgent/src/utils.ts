import AfricasTalking from 'africastalking';

import {config} from 'dotenv';
config();

const africastalking = AfricasTalking({
    apiKey: process.env.AFRICASTALKING_API_KEY as string,
    username: process.env.AFRICASTALKING_USERNAME as string
});

export default africastalking;