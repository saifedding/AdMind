import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/dashboard";
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign,
  Eye,
  MousePointer,
  BarChart3,
  Activity,
  Plus,
  ExternalLink
} from "lucide-react";

const stats = [
  {
    title: "Total Ad Campaigns",
    value: "2,847",
    change: "+12.5%",
    changeType: "increase" as const,
    icon: Target,
  },
  {
    title: "Ad Spend",
    value: "$45,231",
    change: "+8.2%",
    changeType: "increase" as const,
    icon: DollarSign,
  },
  {
    title: "Impressions",
    value: "1.2M",
    change: "+15.3%",
    changeType: "increase" as const,
    icon: Eye,
  },
  {
    title: "Click-through Rate",
    value: "3.24%",
    change: "-2.1%",
    changeType: "decrease" as const,
    icon: MousePointer,
  },
];

const recentActivity = [
  {
    title: "New competitor analysis completed",
    description: "Analysis for Nike Spring Campaign 2024",
    time: "2 hours ago",
    type: "analysis"
  },
  {
    title: "High-performing ad detected",
    description: "Adidas video ad with 12.3% CTR",
    time: "4 hours ago",
    type: "alert"
  },
  {
    title: "Weekly report generated",
    description: "Performance summary for March 2024",
    time: "1 day ago",
    type: "report"
  },
  {
    title: "New trend identified",
    description: "Gaming ads showing 45% increase in engagement",
    time: "2 days ago",
    type: "trend"
  }
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Ad Intelligence Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your campaigns and discover winning strategies from competitors
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/competitors">
                <Target className="mr-2 h-4 w-4" />
                Competitors
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ads">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Ads
              </Link>
            </Button>
            <Button>
              <TrendingUp className="mr-2 h-4 w-4" />
              Analyze Trends
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs ${
                  stat.changeType === 'increase' 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  {stat.change} from last month
                </p>
              </CardContent>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-photon-500 to-photon-400" />
            </Card>
          ))}
        </div>

        {/* Quick Access Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Target className="h-5 w-5" />
                Competitors Hub
              </CardTitle>
              <CardDescription>
                Manage and analyze your competitors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Competitors</span>
                <span className="font-medium">5</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Ads Tracked</span>
                <span className="font-medium">1,247</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1" asChild>
                  <Link href="/competitors">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View All
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <Link href="/competitors">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-500/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <BarChart3 className="h-5 w-5" />
                Ad Intelligence
              </CardTitle>
              <CardDescription>
                Discover winning ad strategies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Analyzed Ads</span>
                <span className="font-medium">432</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Top Performing</span>
                <span className="font-medium">89</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <Link href="/ads">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Browse Ads
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <Link href="/ads">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analyze
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-600">
                <TrendingUp className="h-5 w-5" />
                Trending Insights
              </CardTitle>
              <CardDescription>
                Latest market trends and opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">New Trends</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Hot Keywords</span>
                <span className="font-medium">47</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <Link href="/trends">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Trends
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <Link href="/search">
                    <Eye className="mr-2 h-4 w-4" />
                    Search
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart Placeholder */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-photon-400" />
                Performance Overview
              </CardTitle>
              <CardDescription>
                Campaign performance trends over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center bg-gradient-to-br from-iridium-900/20 to-photon-900/10 rounded-lg border border-border/50">
                <div className="text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-photon-400 to-photon-600 flex items-center justify-center mx-auto">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Chart Integration Ready</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your analytics to see real-time data visualization
                    </p>
                  </div>
                  <Button size="sm" className="btn-glow">
                    Configure Charts
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest insights and alerts from your campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex gap-3">
                  <div className="h-2 w-2 rounded-full bg-photon-400 mt-2 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-gradient-primary flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top Performing Ads
              </CardTitle>
              <CardDescription>
                AI-powered insights from your Ad Intelligence platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-photon-500/10 to-photon-400/5 border border-photon-500/20">
                  <div className="h-12 w-12 rounded bg-gradient-to-br from-photon-400 to-photon-600 flex items-center justify-center">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">High-Performing Tech Ad</p>
                    <p className="text-xs text-muted-foreground">AI Score: 9.2/10</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-photon-400 font-mono">$2,400 spend</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                  <div className="h-12 w-12 rounded bg-gradient-to-br from-photon-400/20 to-photon-600/20 flex items-center justify-center">
                    <Target className="h-6 w-6 text-photon-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Fashion Campaign 2024</p>
                    <p className="text-xs text-muted-foreground">AI Score: 8.7/10</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-mono">$1,800 spend</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                  <div className="h-12 w-12 rounded bg-gradient-to-br from-photon-400/20 to-photon-600/20 flex items-center justify-center">
                    <Target className="h-6 w-6 text-photon-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Gaming Ads Trend</p>
                    <p className="text-xs text-muted-foreground">AI Score: 8.1/10</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-mono">$1,200 spend</p>
                    <p className="text-xs text-muted-foreground">Ended</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50">
                  <Button size="sm" variant="outline" className="w-full" asChild>
                    <Link href="/ads">View All Ads</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-gradient-secondary flex items-center gap-2">
                <Users className="h-5 w-5" />
                Competitor Insights
              </CardTitle>
              <CardDescription>
                Stay ahead with intelligence on your competition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['Nike', 'Adidas', 'Puma'].map((brand, index) => (
                  <div key={brand} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-gradient-to-br from-iridium-400 to-iridium-600 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{brand[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{brand}</p>
                        <p className="text-xs text-muted-foreground">{Math.floor(Math.random() * 50 + 10)} active ads</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </div>
                ))}
                <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
                  <Button size="sm" variant="outline" className="w-full" asChild>
                    <Link href="/competitors">
                      <Target className="mr-2 h-4 w-4" />
                      Manage All Competitors
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" asChild>
                    <Link href="/competitors">
                      <Users className="mr-2 h-4 w-4" />
                      Add New Competitor
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
