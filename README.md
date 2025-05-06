# Argama Backend API Service

This is a Node.js-based REST API service designed to handle various backend operations. It is built with Express.js and can be used as a starting point for web requiring server-side functionality for the Aragma application.

## Setup

<p><h3>Prerequisites</h3></p>

- Node.js

- Postgresql


## Database Setup

- Clone the repository

- Go to: `cd .\backend`

- Install dependencies: `npm install`

- Update .env.sample with Database connection string and AWS S3 bucket details

- Run the migraions using the command: `yarn prisma migrate dev`

- Run the seed database using the command: `yarn prisma db seed`

## To Run Project 🚀

- Go to: `cd .\backend`

- To start the project run: `npm start`

- API service will be available on `http://localhost:5000`
