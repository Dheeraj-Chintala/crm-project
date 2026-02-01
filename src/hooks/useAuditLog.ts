import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export type AuditAction = 
  | "user.login"
  | "user.logout"
  | "user.signup"
  | "user.update_profile"
  | "user.update_role"
  | "user.update_status"
  | "team.create"
  | "team.update"
  | "team.delete"
  | "team.add_member"
  | "team.remove_member"
  | "team.update_member_role";

export type EntityType = "user" | "team" | "team_member" | "profile";

interface LogAuditParams {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export function useAuditLog() {
  const { user } = useAuth();

  const logAudit = useCallback(
    async ({ action, entityType, entityId, oldValues, newValues }: LogAuditParams) => {
      if (!user) {
        console.warn("Cannot log audit event: no user logged in");
        return null;
      }

      try {
        const { data, error } = await supabase.rpc("log_audit_event", {
          _action: action,
          _entity_type: entityType,
          _entity_id: entityId,
          _old_values: oldValues as Json ?? null,
          _new_values: newValues as Json ?? null,
        });

        if (error) {
          console.error("Failed to log audit event:", error);
          return null;
        }

        return data;
      } catch (err) {
        console.error("Error logging audit event:", err);
        return null;
      }
    },
    [user]
  );

  return { logAudit };
}
