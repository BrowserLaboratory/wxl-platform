# Why I Stopped Caring About `tabs vs spaces`

For ten years I had an opinion. I was a tabs person. I argued about it on
Hacker News. I lost some of those arguments and won others, and I think I
ended up on the same number of code reviews either way.

What changed wasn't the technical argument — tabs are still semantically
clearer about intent, spaces still render the same everywhere. What changed
was the tooling. The linter on my last team applied a single style on
commit. Whatever I typed, the repo looked the same the next morning. After
about six weeks I stopped noticing.

I think there's a more general pattern here. Furthermore, this kind of
opinionated tooling has shifted the locus of where engineering taste lives:
not in the typing, but in the tool selection. Moreover, it's worth noting
that the people who care most about format are often the ones who picked
the linter — they got their preference encoded once, then everyone else
moved on.

That's a fine outcome, honestly. It means we can leverage our argument
energy elsewhere — like deciding whether the code is even doing the right
thing. Consider what would happen if every code review opened with "is
this the right behavior?" instead of "two-space indent please". I think
the codebase would be slightly better and the reviewers would be a lot
less tired.

So: I still type tabs. The linter still converts them. I don't argue
about it anymore. Whatever team I land on next, I'll do the same. Some
opinions are worth keeping; some you only realize were costing you when
you stop carrying them.
