import { z } from 'zod'

export const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Telefone invalido')

export const loginSchema = z.object({
  email: z.string().trim().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
})

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Nome obrigatorio'),
    email: z.string().trim().email('Email invalido'),
    phone: phoneSchema,
    password: z.string().min(6, 'Minimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirme a senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas precisam ser iguais',
    path: ['confirmPassword'],
  })

export const userSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatorio'),
  email: z.string().trim().email('Email invalido'),
  phone: phoneSchema.optional().or(z.literal('')),
  role: z.enum(['admin', 'dev', 'user', 'reseller']),
  status: z.string().optional(),
  password: z.string().min(6, 'Minimo 6 caracteres').optional().or(z.literal('')),
})

export const creditRequestSchema = z.object({
  serverId: z.string().min(1, 'Selecione um servidor'),
  login: z.string().trim().optional(),
  credits: z.coerce.number().positive('Creditos devem ser positivos'),
  value: z.coerce.number().nonnegative('Valor invalido').optional(),
  paymentType: z.enum(['prepaid', 'postpaid']).optional(),
})

export const pixKeySchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1, 'Tipo obrigatorio'),
  key: z.string().trim().min(3, 'Chave PIX obrigatoria'),
  label: z.string().trim().optional(),
  active: z.boolean().optional(),
})

export const settingsSchema = z.object({
  companyName: z.string().trim().min(1, 'Nome da empresa obrigatorio'),
  companyEmail: z.string().trim().email('Email invalido').optional().or(z.literal('')),
  companyPhone: z.string().trim().optional(),
  pixKeys: z.array(pixKeySchema).default([]),
  adminWhatsapp: z.string().trim().optional(),
})

export const templateSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatorio'),
  type: z.enum(['recharge', 'queue', 'proof', 'general']),
  content: z.string().trim().min(10, 'Conteudo muito curto'),
  active: z.boolean().optional(),
})

export const serverSchema = z.object({
  name: z.string().trim().min(2, 'Nome do servidor obrigatorio'),
  panelLink: z.string().trim().url('Link invalido').optional().or(z.literal('')),
  description: z.string().trim().optional(),
  valuePerCredit: z.coerce.number().nonnegative('Preco invalido'),
  costPerCredit: z.coerce.number().nonnegative('Custo invalido').optional(),
  notes: z.string().trim().optional(),
  active: z.boolean().optional(),
})

export const supplierSchema = z.object({
  name: z.string().trim().min(2, 'Nome do fornecedor obrigatorio'),
  contact: z.string().trim().optional(),
  panelLogin: z.string().trim().optional(),
  panelLink: z.string().trim().url('Link invalido').optional().or(z.literal('')),
  costPerCredit: z.coerce.number().nonnegative('Custo invalido').optional(),
  active: z.boolean().optional(),
})

export const fornecedorSchema = z.object({
  name: z.string().trim().min(2, 'Nome do fornecedor obrigatorio'),
  contact: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  active: z.boolean().optional(),
})

export const serverFornecedorSchema = z.object({
  serverId: z.string().min(1, 'Servidor obrigatorio'),
  fornecedorId: z.string().min(1, 'Fornecedor obrigatorio'),
  costPerCredit: z.coerce.number().nonnegative('Custo invalido'),
  panelLogin: z.string().trim().min(1, 'Login do painel obrigatorio'),
  panelLink: z.string().trim().url('Link invalido').optional().or(z.literal('')),
  panelPassword: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  active: z.boolean().optional(),
})

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatorio'),
  phone: z.string().trim().optional(),
})

export type LoginForm = z.infer<typeof loginSchema>
export type RegisterForm = z.infer<typeof registerSchema>
export type UserForm = z.infer<typeof userSchema>
export type CreditRequestForm = z.infer<typeof creditRequestSchema>
export type SettingsForm = z.infer<typeof settingsSchema>
export type TemplateForm = z.infer<typeof templateSchema>
export type ServerForm = z.infer<typeof serverSchema>
export type SupplierForm = z.infer<typeof supplierSchema>
export type FornecedorForm = z.infer<typeof fornecedorSchema>
export type ServerFornecedorForm = z.infer<typeof serverFornecedorSchema>
export type ProfileForm = z.infer<typeof profileSchema>
