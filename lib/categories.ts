export const CATEGORIES = [
  "Auto & Transport",
  "Beauty & Personal Care",
  "Boat",
  "Child Support",
  "Clothing & Fashion",
  "Credit Cards",
  "Deposits",
  "Dining",
  "Entertainment",
  "Fee Waivers",
  "Fees & Banking",
  "Groceries",
  "Home & Garden",
  "Housing",
  "Kids & Education",
  "Loans",
  "Payroll",
  "Pets",
  "Returns & Refunds",
  "Shopping",
  "Subscriptions & Services",
  "Transfers",
  "Transfers In",
  "Travel",
  "Uncategorized",
  "Cash",
] as const;

export const SPENDING_CATEGORIES = CATEGORIES.filter(
  (c) =>
    ![
      "Deposits",
      "Fee Waivers",
      "Payroll",
      "Returns & Refunds",
      "Transfers",
      "Transfers In",
      "Cash",
      "Credit Cards",
      "Loans",
      "Child Support",
    ].includes(c)
);
