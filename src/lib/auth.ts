import bcrypt from 'bcryptjs';
import * as jose from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  'physioflow-local-secret-key-12345'
);

export const authLib = {
  async hashPassword(password: string): Promise<string> {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compareSync(password, hash);
  },

  async createToken(payload: any): Promise<string> {
    return new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);
  },

  async verifyToken(token: string): Promise<any> {
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      return payload;
    } catch (e) {
      return null;
    }
  }
};
