import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import apiRouter from './routes/api';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve static UI
app.use(express.static(path.join(__dirname, 'ui')));

// API Routes
app.use('/api', apiRouter);

// Fallback to index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});

// Export app for Vercel
export default app;

// Only listen if run directly (not imported)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
