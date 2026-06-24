// -------- Domain Layer -------- //
import { TenantDao } from '../../domain/tenant';
import { UserDao } from '../../domain/user';
// -------- Infrastructure -------- //
import { verifyPassword } from '../../infrastructure/password';
import { signToken } from '../../infrastructure/jwt';

interface LoginResult {
  token: string;
  user: { id: string; email: string; displayName: string };
}

/** Authenticate by tenant slug + email + password, returning a JWT carrying tenant + org context. */
const login = async (tenantSlug: string, email: string, password: string): Promise<LoginResult | null> => {
  const tenant = await TenantDao.findBySlug(tenantSlug);
  if (!tenant) return null;

  const user = await UserDao.findByTenantAndEmail(tenant.id, email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null;

  const token = signToken({
    sub: user.id,
    tenantId: tenant.id,
    orgUnitId: user.orgUnitId,
    email: user.email,
    roleVersion: tenant.policyVersion,
  });
  return { token, user: { id: user.id, email: user.email, displayName: user.displayName } };
};

export { login };
