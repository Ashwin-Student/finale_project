# Repository Guidelines

## Project Structure & Module Organization
This repository is a polyglot monorepo comprising frontend, backend, AI/ML, and blockchain components:

- **Ai_Ml/**: Python-based AI logic and LLM code.
- **backend/**: Flask-based API managing users, soil data, and predictions, using MySQL for persistence.
- **Blockchain/**: Hardhat-based Solidity contracts and scripts for decentralized agriculture features.
- **frontend/**: React application built with Vite and TypeScript, styled with Tailwind CSS.
- **Data/**: Repository for datasets used by the AI/ML and backend modules.

## Build, Test, and Development Commands

### Frontend (React + Vite)
Run from the `frontend/` directory:
- `npm install`: Install dependencies.
- `npm run dev`: Start development server on `http://localhost:3000`.
- `npm run build`: Build production assets.
- `npm run lint`: Run TypeScript type checking.

### Backend (Flask)
Run from the `backend/` directory:
- `pip install -r requirements.txt`: Install Python dependencies.
- `python app.py`: Start the Flask application.

### Blockchain (Hardhat)
Run from the `Blockchain/` directory:
- `npm install`: Install Hardhat and dependencies.
- `npx hardhat compile`: Compile Solidity contracts.
- `npx hardhat test`: Run contract tests.

## Coding Style & Naming Conventions
- **Frontend**: Follows standard React/TypeScript patterns. Uses `lucide-react` for icons and `motion` for animations.
- **Backend**: Python PEP 8 style. Uses `mysql-connector-python` for database interactions.
- **Blockchain**: Solidity best practices for contract development.

## Testing Guidelines
- **Frontend**: Linting via `tsc --noEmit`.
- **Blockchain**: Hardhat test suite located in `Blockchain/test/`.

## Commit & Pull Request Guidelines
- Follow descriptive commit message patterns (e.g., "Update <feature>", "Initial commit").
- Ensure all types pass (`npm run lint` in frontend) before pushing changes.
