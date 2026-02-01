import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, UserCog } from "lucide-react";

const roles = [
  {
    name: "Admin",
    description: "Full access to all features and settings. Can manage users and roles.",
    permissions: [
      "Manage all users",
      "Assign/remove roles",
      "Access all data",
      "Configure system settings",
      "View all reports",
    ],
    icon: Shield,
    variant: "default" as const,
  },
  {
    name: "Manager",
    description: "Can view team data and manage assigned resources.",
    permissions: [
      "View team members",
      "Access team data",
      "Create and manage records",
      "View reports",
    ],
    icon: UserCog,
    variant: "secondary" as const,
  },
  {
    name: "User",
    description: "Standard access to CRM features within assigned scope.",
    permissions: [
      "View own data",
      "Create and edit own records",
      "Basic reporting",
    ],
    icon: Users,
    variant: "outline" as const,
  },
];

export default function AdminRoles() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="crm-page-header">
        <div>
          <h1>Roles</h1>
          <p className="mt-1 text-muted-foreground">
            Role definitions and permissions overview
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.name}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <role.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {role.name}
                    <Badge variant={role.variant} className="text-xs">
                      {role.name.toLowerCase()}
                    </Badge>
                  </CardTitle>
                </div>
              </div>
              <CardDescription className="mt-2">
                {role.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <h4 className="mb-2 text-sm font-medium">Permissions</h4>
              <ul className="space-y-1">
                {role.permissions.map((permission) => (
                  <li
                    key={permission}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                    {permission}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Hierarchy</CardTitle>
          <CardDescription>
            Understanding the permission hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Roles follow a hierarchical structure where higher-level roles inherit
            all permissions from lower levels. Admins have full access, Managers
            can access all User permissions plus team management, and Users have
            access to their own data and basic CRM features.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
