import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as admin from 'firebase-admin';

dotenv.config();

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).send('Unauthorized');
  }

  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    res.status(401).send('Unauthorized');
  }
};

const genAI = new GoogleGenerativeAI(process.env.API_KEY!);

app.post('/api/proxy', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { model, contents, config } = req.body;

    if (!model || !contents) {
      return res.status(400).json({ error: 'Missing required fields: model and contents' });
    }

    const generativeModel = genAI.getGenerativeModel({ model });
    const result = await generativeModel.generateContent({ contents, ...config });

    res.json(result);
  } catch (error) {
    console.error('Error proxying request to Google Generative AI:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('Starting server...');
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
