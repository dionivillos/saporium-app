import type { CreateRecipeInput } from '@/validations/recipe';

import type { Database } from './client';
import { createRecipe } from './recipes';
import { recipes } from './schema';

const SAMPLE_RECIPES: CreateRecipeInput[] = [
  {
    title: 'Tortilla de patatas',
    description: 'La de toda la vida, jugosa por dentro.',
    difficulty: 'easy',
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    servingsMin: 4,
    tips: 'Deja reposar la patata en el huevo batido diez minutos antes de cuajarla.',
    ingredients: [
      { name: 'Patatas', quantity: '600', unit: 'g', rawText: '600 g de patatas' },
      { name: 'Huevos', quantity: '6', rawText: '6 huevos' },
      { name: 'Cebolla', quantity: '1', rawText: '1 cebolla' },
      { name: 'Aceite de oliva', rawText: 'Aceite de oliva virgen extra' },
      { name: 'Sal', rawText: 'Sal' },
    ],
    steps: [
      { content: 'Pela y corta las patatas en láminas finas. Sala al gusto.' },
      { content: 'Pocha las patatas y la cebolla a fuego suave hasta que estén tiernas.' },
      { content: 'Bate los huevos y mézclalos con la patata escurrida.' },
      { content: 'Cuaja la tortilla en una sartén antiadherente, dándole la vuelta una vez.' },
    ],
    tags: ['cena', 'española', 'clásicos'],
  },
  {
    title: 'Lentejas con verduras',
    description: 'Un guiso de cuchara que mejora al día siguiente.',
    difficulty: 'easy',
    prepTimeMinutes: 10,
    cookTimeMinutes: 45,
    servingsMin: 4,
    servingsMax: 6,
    ingredients: [
      { name: 'Lentejas pardinas', quantity: '400', unit: 'g', rawText: '400 g de lentejas' },
      { name: 'Zanahoria', quantity: '2', rawText: '2 zanahorias' },
      { name: 'Puerro', quantity: '1', rawText: '1 puerro' },
      { name: 'Pimentón dulce', quantity: '1', unit: 'cdta', rawText: '1 cdta de pimentón' },
      { name: 'Laurel', quantity: '1', unit: 'hoja', rawText: '1 hoja de laurel' },
    ],
    steps: [
      { content: 'Sofríe la verdura picada hasta que empiece a dorarse.' },
      { content: 'Añade el pimentón fuera del fuego para que no amargue.' },
      { content: 'Incorpora las lentejas y cubre con agua. Añade el laurel.' },
      { content: 'Cuece a fuego lento unos 40 minutos, hasta que estén tiernas.' },
    ],
    tags: ['comida', 'legumbres', 'batch cooking'],
  },
  {
    title: 'Bizcocho de yogur',
    description: 'El del vaso de yogur como medida. Imposible fallar.',
    difficulty: 'easy',
    prepTimeMinutes: 10,
    cookTimeMinutes: 40,
    servingsMin: 8,
    ingredients: [
      { name: 'Yogur natural', quantity: '1', rawText: '1 yogur natural' },
      { name: 'Azúcar', quantity: '2', unit: 'vasos', rawText: '2 vasos de azúcar' },
      { name: 'Harina', quantity: '3', unit: 'vasos', rawText: '3 vasos de harina' },
      { name: 'Aceite de girasol', quantity: '1', unit: 'vaso', rawText: '1 vaso de aceite' },
      { name: 'Huevos', quantity: '3', rawText: '3 huevos' },
      { name: 'Levadura química', quantity: '1', unit: 'sobre', rawText: '1 sobre de levadura' },
    ],
    steps: [
      { content: 'Precalienta el horno a 180 °C.' },
      { content: 'Mezcla el yogur con el azúcar, el aceite y los huevos.' },
      { content: 'Añade la harina y la levadura tamizadas, sin batir de más.' },
      { content: 'Hornea 40 minutos. Comprueba con un palillo antes de sacarlo.' },
    ],
    tags: ['postre', 'horno'],
  },
];

/**
 * Development helper: fills an empty database so the list and detail screens
 * have something to show. Never runs in production builds, and never touches a
 * database that already holds recipes.
 */
export function seedIfEmpty(db: Database): void {
  if (!__DEV__) return;

  const existing = db.select({ id: recipes.id }).from(recipes).limit(1).get();
  if (existing) return;

  for (const recipe of SAMPLE_RECIPES) {
    createRecipe(db, recipe);
  }
}
