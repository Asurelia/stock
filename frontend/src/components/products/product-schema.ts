import { z } from "zod"

export const productSchema = z.object({
    name: z.string().min(2, {
        message: "Le nom doit contenir au moins 2 caractères.",
    }),
    category: z.string().min(1, {
        message: "La catégorie est requise.",
    }),
    quantity: z.coerce.number().min(0, {
        message: "La quantité ne peut pas être négative.",
    }),
    unit: z.string().min(1, {
        message: "L'unité est requise.",
    }),
    minStock: z.coerce.number().min(0).default(0),
    price: z.coerce.number().min(0).default(0),
    avgConsumption: z.coerce.number().min(0).default(0),
})

export type ProductFormValues = z.infer<typeof productSchema>
