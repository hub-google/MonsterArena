-- Arena: prevent unauthorized access to six exposed Game tables.
-- Direct game writes must use authenticated SECURITY DEFINER RPCs.
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY arena_guild_directory_read ON public.guilds FOR SELECT TO authenticated USING (true);
CREATE POLICY arena_guild_member_read ON public.guild_members FOR SELECT TO authenticated USING (
  user_id = (select auth.uid()) OR EXISTS
    (SELECT 1 FROM public.guilds g WHERE g.guild_id = guild_members.guild_id AND g.leader_id = (select auth.uid()))
);
CREATE POLICY arena_guild_application_read ON public.guild_applications FOR SELECT TO authenticated USING (
  user_id = (select auth.uid()) OR EXISTS
    (SELECT 1 FROM public.guilds g WHERE g.guild_id = guild_applications.guild_id AND g.leader_id = (select auth.uid()))
);
CREATE POLICY arena_friend_read ON public.friends FOR SELECT TO authenticated USING (
  user_id = (select auth.uid()) OR friend_uid = (select auth.uid())
);
CREATE POLICY arena_challenge_read ON public.challenges FOR SELECT TO authenticated USING (
  challenger_uid = (select auth.uid()) OR target_uid = (select auth.uid())
);
CREATE POLICY arena_daily_quest_read ON public.daily_quests FOR SELECT TO authenticated USING (
  user_id = (select auth.uid())
);

-- RLS does not prevent TRUNCATE; remove direct table privileges.
REVOKE ALL ON TABLE public.guilds, public.guild_members, public.guild_applications,
  public.friends, public.challenges, public.daily_quests
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.guilds, public.guild_members, public.guild_applications,
  public.friends, public.challenges, public.daily_quests TO authenticated;
