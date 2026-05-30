# PokeDex Web

A React.js web application built with Vite for exploring Pokemon information.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
cd web
npm install
```

### Development Server

```bash
npm run dev
```

The application will open at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

## Project Structure

```
web/
├── src/
│   ├── components/       # React components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API services
│   ├── App.tsx          # Main App component
│   ├── App.css          # App styles
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML entry point
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── eslint.config.js     # ESLint configuration
```

## Technologies Used

- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **ESLint** - Code linting

## Features

- Search Pokemon by name
- View detailed Pokemon information
- Browse Pokemon by generation
- Responsive design

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
VITE_API_URL=https://pokeapi.co/api/v2
```

## License

MIT
