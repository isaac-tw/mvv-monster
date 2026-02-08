import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLineIdFromStateless(id: string) {
  return id.split(":").slice(0, -1).join(":");
}

export function calculateDelay(planned: string, live: string) {
  if (planned === live) return 0;
  const [pH, pM] = planned.split(':').map(Number);
  const [lH, lM] = live.split(':').map(Number);
  return (lH * 60 + lM) - (pH * 60 + pM);
};
