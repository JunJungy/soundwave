import { Home, Search, Library, Plus, Shield, Music, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import logoUrl from "@assets/soundwave-logo.png";

const navigationItems = [
  { title: "Home", url: "/", icon: Home, testId: "link-home" },
  { title: "Search", url: "/search", icon: Search, testId: "link-search" },
  { title: "Your Library", url: "/library", icon: Library, testId: "link-library" },
  { title: "Following", url: "/following", icon: Users, testId: "link-following" },
];

interface AppSidebarProps {
  playlists?: Array<{ id: string; name: string }>;
  onCreatePlaylist?: () => void;
}

export function AppSidebar({ playlists = [], onCreatePlaylist }: AppSidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center p-1.5">
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <rect x="2" y="8" width="2" height="8" fill="currentColor" className="text-primary-foreground" rx="1"/>
              <rect x="6" y="5" width="2" height="14" fill="currentColor" className="text-primary-foreground" rx="1"/>
              <rect x="10" y="3" width="2" height="18" fill="currentColor" className="text-primary-foreground" rx="1"/>
              <rect x="14" y="6" width="2" height="12" fill="currentColor" className="text-primary-foreground" rx="1"/>
              <rect x="18" y="4" width="2" height="16" fill="currentColor" className="text-primary-foreground" rx="1"/>
              <rect x="22" y="9" width="2" height="6" fill="currentColor" className="text-primary-foreground" rx="1"/>
            </svg>
          </div>
          <span className="font-display font-bold text-xl">Soundwave</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={item.testId}>
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(user?.isAdmin === 1 || user?.isArtist === 1) && (
          <>
            <Separator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {user?.isAdmin === 1 && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/admin-panel"} data-testid="link-admin-panel">
                        <Link href="/admin-panel">
                          <Shield className="h-5 w-5" />
                          <span className="font-medium">Admin Panel</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {user?.isArtist === 1 && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/artist-dashboard"} data-testid="link-artist-dashboard">
                        <Link href="/artist-dashboard">
                          <Music className="h-5 w-5" />
                          <span className="font-medium">Artist Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <Separator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between px-3">
            <span>Playlists</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={onCreatePlaylist}
              data-testid="button-create-playlist"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {playlists.map((playlist) => (
                <SidebarMenuItem key={playlist.id}>
                  <SidebarMenuButton asChild data-testid={`link-playlist-${playlist.id}`}>
                    <Link href={`/playlist/${playlist.id}`}>
                      <span className="truncate">{playlist.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground px-2">
          Developed by Void AI
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
