import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { cleaningRecordRouter } from './routes/cleaningRecord.routes';
import { equipmentRouter } from './routes/equipment.routes';

export const app = express();

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || 'http://localhost:5173');
	res.header('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
	res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
	if (req.method === 'OPTIONS') {
		res.sendStatus(204);
		return;
	}
	next();
});
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/equipment', equipmentRouter);
app.use('/api', cleaningRecordRouter);
app.use(notFoundHandler);
app.use(errorHandler);
