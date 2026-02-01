import { useAuth } from "@/contexts/AuthContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTasks, useOverdueTasks } from "@/hooks/useTasks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskList } from "@/components/tasks/TaskList";
import { Link } from "react-router-dom";
import { Users, Briefcase, TrendingUp, Target, Plus, AlertTriangle, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { profile, role } = useAuth();
  const { data: analytics, loading: analyticsLoading } = useAnalytics();
  const { tasks, loading: tasksLoading, updateTaskStatus } = useTasks();
  const { overdueTasks } = useOverdueTasks();

  const upcomingTasks = tasks
    .filter((t) => t.status === "pending" || t.status === "in_progress")
    .slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const stats = [
    {
      title: "Total Leads",
      value: analytics?.totalLeads || 0,
      description: `${analytics?.totalContacts || 0} contacts`,
      icon: Users,
      href: "/leads",
    },
    {
      title: "Active Deals",
      value: analytics?.totalDeals || 0,
      description: formatCurrency(analytics?.totalDealValue || 0),
      icon: Briefcase,
      href: "/deals",
    },
    {
      title: "Closed Won",
      value: formatCurrency(analytics?.closedWonValue || 0),
      description: "Total revenue",
      icon: TrendingUp,
      isValue: true,
      href: "/reports",
    },
    {
      title: "Conversion Rate",
      value: `${(analytics?.conversionRate || 0).toFixed(1)}%`,
      description: "Leads to customers",
      icon: Target,
      href: "/reports",
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="crm-page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back, {profile?.full_name || "User"}
          </p>
        </div>
        <Badge variant="outline" className="capitalize">
          {role || "user"}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {analyticsLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : (
          stats.map((stat) => (
            <Link key={stat.title} to={stat.href}>
              <Card className="crm-stat-card hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Overdue Tasks Alert */}
      {overdueTasks.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/tasks">
              <Button variant="destructive" size="sm">
                View Overdue Tasks
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Tasks</CardTitle>
              <CardDescription>Your pending tasks and follow-ups</CardDescription>
            </div>
            <Link to="/tasks">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Task
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateTaskStatus(task.id, "completed")}
                    >
                      Complete
                    </Button>
                  </div>
                ))}
                <Link to="/tasks" className="block">
                  <Button variant="ghost" className="w-full">
                    View All Tasks
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <p>No pending tasks</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link to="/leads">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Add New Lead
              </Button>
            </Link>
            <Link to="/contacts">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Add New Contact
              </Button>
            </Link>
            <Link to="/deals">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Create Deal
              </Button>
            </Link>
            <Link to="/tasks">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            </Link>
            <Link to="/reports" className="sm:col-span-2">
              <Button variant="secondary" className="w-full">
                View Reports & Analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Summary */}
      {analytics && analytics.dealsByStage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Summary</CardTitle>
            <CardDescription>Deals by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {analytics.dealsByStage.map((stage) => (
                <div
                  key={stage.stage}
                  className="p-4 border rounded-lg text-center"
                >
                  <p className="text-sm text-muted-foreground capitalize">
                    {stage.stage.replace(/_/g, " ")}
                  </p>
                  <p className="text-2xl font-bold">{stage.count}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stage.value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
