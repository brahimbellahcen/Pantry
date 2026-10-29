.PHONY: deploy dev test seed migrate

## 🔧 Set Vercel env vars from backend/.env and redeploy
set-env:
	@chmod +x scripts/set-vercel-env.sh && ./scripts/set-vercel-env.sh

## ⚡ Set Vercel env vars + deploy both projects (needs VERCEL_TOKEN in backend/.env)
setup-vercel:
	@chmod +x scripts/vercel-setup.sh && ./scripts/vercel-setup.sh

## 🚀 Deploy to Vercel (backend + frontend) — recommended
deploy-vercel:
	@chmod +x scripts/deploy-vercel.sh && ./scripts/deploy-vercel.sh

## 🚀 Deploy via Railway + Vercel (alternative)
deploy:
	@chmod +x scripts/deploy.sh && ./scripts/deploy.sh

## 🧪 Run all backend tests
test:
	cd backend && TESTING=1 python -m pytest tests/ -v

## 🌱 Seed demo data (run after migrations)
seed:
	cd backend && python -m scripts.seed

## 🗄️  Run database migrations
migrate:
	cd backend && alembic upgrade head

## 💻 Start local dev environment
dev:
	@echo "Starting backend and frontend..."
	@cd backend && uvicorn app.main:app --reload --port 8000 &
	@cd frontend && npm run dev &
	@echo ""
	@echo "  Backend:  http://localhost:8000/api/docs"
	@echo "  Frontend: http://localhost:5173"
	@echo ""
	@echo "Press Ctrl+C to stop both servers"
	@wait

## 🐳 Start with Docker Compose
docker:
	docker compose up --build

## 📦 Install all dependencies
install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

## 🧹 Clean deployment state (to redeploy from scratch)
clean-deploy:
	rm -f .deploy-state
	@echo "Deploy state cleared. Run 'make deploy' to redeploy."

## 🚀 Full deploy from this machine (needs backend/.env)
deploy-now:
	@chmod +x scripts/deploy-now.sh && ./scripts/deploy-now.sh
