require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const helmet = require('helmet');



const app = express();
const PORT = process.env.PORT || 3000;

//redis client
const redisClient = new Redis(
  process.env.REDIS_URL
);

//Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

//Rate limiting

