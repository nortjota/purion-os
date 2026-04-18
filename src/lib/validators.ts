import { z } from 'zod'

export const signupSchema = z.object({
  nomeEmpresa: z.string().min(1).max(200),
  nomeAdmin:   z.string().min(1).max(200),
  email:       z.string().email(),
  password:    z.string().min(8).max(128),
})

export const inviteSchema = z.object({
  email:     z.string().email(),
  cargo:     z.string().max(100).optional(),
  tenant_id: z.string().uuid(),
})

export const financeiroCriarSchema = z.object({
  tipo:      z.enum(['receita', 'despesa']),
  categoria: z.string().min(1).max(100),
  valor:     z.number().positive().max(999_999),
  data:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  descricao: z.string().max(500).optional(),
})

export const leadCriarSchema = z.object({
  nome:             z.string().min(1).max(200),
  tipo:             z.enum(['estetica', 'detailer', 'concessionaria', 'outro']),
  cidade:           z.string().max(100).optional(),
  estado:           z.enum(['DF', 'SP', 'SC', 'outros']),
  valor_estimado:   z.number().nonnegative().optional(),
  probabilidade:    z.number().min(0).max(100).optional(),
})

export const tarefaCriarSchema = z.object({
  titulo:      z.string().min(1).max(200),
  descricao:   z.string().max(1000).optional(),
  prazo:       z.string().optional(),
  prioridade:  z.enum(['alta', 'media', 'baixa']),
  responsavel: z.string().uuid(),
})
