import { Home, Search, Library, Plus, Shield, Music } from "lucide-react";
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

const navigationItems = [
  { title: "Home", url: "/", icon: Home, testId: "link-home" },
  { title: "Search", url: "/search", icon: Search, testId: "link-search" },
  { title: "Your Library", url: "/library", icon: Library, testId: "link-library" },
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
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-primary-foreground">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
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
                      <SidebarMenuButton asChild isActive={location === "/admin"} data-testid="link-admin">
                        <Link href="/admin">
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
