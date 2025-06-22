# 🎬 movieapp-MERN

Welcome to **movieapp-MERN** — a full-stack movie application leveraging the power of **NestJS**, **Next.js**, and a Python microservice for recommendations.

---

## 🚀 Quick Start

Set up and launch all services with these simple steps:

### 1. Backend (NestJS)
```bash
cd nest-backend-real
npm install
npm run start:dev
```

### 2. Frontend (Next.js)
```bash
cd next-frontend
npm install
npm run dev
```

### 3. Recommendation Microservice (Python + FastAPI)
```bash
cd Python-recommendation-microservice
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

---

## 📚 API Documentation

Explore and test the backend API with Swagger UI:

[http://localhost:3001/api/docs](http://localhost:3001/api/docs)

**Swagger UI Features:**
- Interactive API exploration & testing
- JWT authentication support
- Complete endpoint documentation

---

Happy coding! 🚀🍿
