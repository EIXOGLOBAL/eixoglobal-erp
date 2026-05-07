import { SignJWT } from 'jose'

const SECRET = '15tnp3j1ao566calkwj4s2pwia1a5zu5s1ip51xktq5e3e5ekrpabpx5jt1xny036awil1m15sppfrba2hmj1jtxwcn1m9s6ia1bx3gqy'
const key = new TextEncoder().encode(SECRET)

const payload = {
  user: {
    id: 'fbade0f2-3d08-447d-84e1-f4d1d1119c37',
    username: 'admin',
    email: 'danilo@eixoglobal.com.br',
    name: 'Administrador',
    role: 'ADMIN',
    companyId: 'f76b1d48-d2bc-4837-ab7a-c5c9c240c09c',
    canDelete: true,
    canApprove: true,
    canManageFinancial: true,
    canManageHR: true,
    canManageSystem: true,
    canViewReports: true
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
}

const token = await new SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('24h')
  .sign(key)

console.log(token)
