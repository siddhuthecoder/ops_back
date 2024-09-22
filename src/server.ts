import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerFile from './swagger_output.json';
import api from './routes';
import mongoose from 'mongoose';

// Ensure that the environment variables are correctly typed
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || '';

const app: Application = express();

app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use('/api', api);


mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err: Error) => console.error('MongoDB connection error:', err));

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
