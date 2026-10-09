import AuthForm from "../auth-form";

export const metadata = { title: "Sign in | YourTab", description: "Sign in to YourTab." };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
