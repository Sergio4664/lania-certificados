export interface LoginDTO {
  email: string;
  password: string;
}

export interface TokenDTO {
  access_token: string;
  token_type: string;
}