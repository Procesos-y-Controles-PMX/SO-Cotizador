"use client";

import { FormEvent } from "react";

interface LoginFormProps {
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export default function LoginForm({
  email,
  password,
  loading,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="w-full max-w-md space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Iniciar sesión</h2>
        <p className="text-sm text-gray-500">Ingresa tu correo y contraseña para acceder al sistema.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          placeholder="usuario@cemex.com"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          required
          autoComplete="username"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/40"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          placeholder="Tu contraseña"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/40"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-all duration-200 hover:bg-red-700 hover:shadow-red-600/40 active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-red-600"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Accediendo...
          </>
        ) : (
          "Acceder"
        )}
      </button>

      <div className="space-y-1 pt-4 text-center">
        <p className="text-xs text-gray-400">Acceso restringido a personal autorizado.</p>
        <p className="text-xs font-medium text-gray-500">Promexma / CEMEX</p>
      </div>
    </form>
  );
}
