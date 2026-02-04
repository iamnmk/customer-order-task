⚙️ Setup Instructions
Prerequisites

Node.js (LTS)

Angular CLI

.NET 8 SDK

PostgreSQL



Backend Setup

Navigate to backend folder:

cd server


Update database connection string in appsettings.json:

"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=orderdb;Username=postgres;Password=yourpassword"
}


Apply migrations:

dotnet ef database update


Run backend:

dotnet run


Backend runs at:

https://localhost:7036

Frontend Setup

Navigate to frontend folder:

cd client


Install dependencies:

npm install


Update API base URL:

// src/environments/environment.ts
export const environment = {
  apiBaseUrl: 'https://localhost:7036'
};


Run Angular app:

ng serve


Frontend runs at:

http://localhost:4200