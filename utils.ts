

export const calculateDiffPercent = (marsil: number, boraceia: number): number => {
  if (marsil === 0 && boraceia === 0) return 0;
  // Let's compare Marsil vs Boraceia. If Marsil is 100 and Boraceia is 20, Marsil has 400% more.
  if (boraceia === 0) return 100;
  const diff = ((marsil - boraceia) / boraceia) * 100;
  return parseFloat(diff.toFixed(2));
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

export const isWithinLast7Days = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
};
