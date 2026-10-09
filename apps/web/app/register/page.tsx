import AuthForm from "../auth-form";

export const metadata = { title: "Create account | YourTab", description: "Create your YourTab account." };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
