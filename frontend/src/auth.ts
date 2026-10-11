import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import { config } from './config';

let userPool: CognitoUserPool | null = null;

const getUserPool = () => {
  if (!userPool) {
    if (!config.userPoolId || !config.clientId) {
      throw new Error('Cognito User Pool ID or Client ID is not configured. Please set them in your environment variables.');
    }
    userPool = new CognitoUserPool({
      UserPoolId: config.userPoolId,
      ClientId: config.clientId,
    });
  }
  return userPool;
};

export const register = (email: string, password: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
      ];

      getUserPool().signUp(email, password, attributeList, [], (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const login = (email: string, password: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: getUserPool(),
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          resolve(result);
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const logout = () => {
  try {
    const cognitoUser = getUserPool().getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
  } catch (err) {
    console.error('Logout error:', err);
  }
};

export const getCurrentSession = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const cognitoUser = getUserPool().getCurrentUser();
      if (!cognitoUser) {
        reject(new Error('No current user'));
        return;
      }

      cognitoUser.getSession((err: any, session: any) => {
        if (err) {
          reject(err);
          return;
        }
        if (session.isValid()) {
          resolve(session);
        } else {
          reject(new Error('Session invalid'));
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const getToken = async (): Promise<string | null> => {
  try {
    const session = await getCurrentSession();
    return session.getIdToken().getJwtToken();
  } catch (e) {
    return null;
  }
};
