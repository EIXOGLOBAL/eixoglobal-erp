import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'danilo@eixoglobal.com.br'
    const password = await bcrypt.hash('123456', 10) // Senha padrão: 123456

    const user = await prisma.user.upsert({
        where: { email },
        update: {}, // Não faz nada se já existir
        create: {
            email,
            name: 'Danilo',
            password,
            role: 'ADMIN',
        },
    })

    console.log(`Usuário ${user.email} criado/atualizado com sucesso. Role: ${user.role}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
