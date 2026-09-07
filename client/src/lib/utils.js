import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

//clsx(inputs): This package allows you to conditionally toggle Tailwind classes
//  using objects, arrays, or strings 
// (e.g., {'bg-blue-500': isActive, 'bg-gray-500': !isActive}).

//twMerge(...): This package solves Tailwind's cascading problem. If you pass both 
// px-2 and px-4 to an element, standard CSS might apply the wrong one. 
// twMerge intelligently overrides the older class with the newer one, ensuring px-4 
// wins.