# 🎬 movieapp-MERN

Welcome to **movieapp-MERN** — a full-stack movie application leveraging the power of **NestJS**, **Next.js**, and a Python microservice for recommendations.

---

## 🚀 Quick Start

**Please start the Frontend and Backend before launching the Python microservice!**

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
> ⚠️ **Note:** Start this service **after** both the backend and frontend are running.
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


