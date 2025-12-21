import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLineIdFromStateless(id: string) {
  return id.split(":").slice(0, -1).join(":");
}
