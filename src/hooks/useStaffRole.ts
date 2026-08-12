import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

export function useStaffRole() {
  const { user } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["staff-role", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff").select("role").eq("id", user!.id).single();
      if (error) throw error;
      return data.role;
    },
    enabled: Boolean(user?.id),
  });

  return { role: data ?? null, isAdmin: data === "admin", isLoading };
}
