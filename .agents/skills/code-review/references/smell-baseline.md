# Standards smell baseline

Use these Fowler code smells (Refactoring, chapter 3) as heuristics when reviewing
the captured change. Repository standards override them. Label each as a judgment
call, quote its hunk and explain its impact. Skip checks already enforced by tooling.

- **Mysterious Name:** a name obscures purpose; expose intent in the name.
- **Duplicated Code:** repeated logic; consider extracting shared behavior.
- **Feature Envy:** behavior relies on another object's data; consider moving it.
- **Data Clumps:** recurring field groups; consider a cohesive type.
- **Primitive Obsession:** primitives conceal a domain concept; consider a domain type.
- **Repeated Switches:** repeated branching on the same type; consider shared dispatch.
- **Shotgun Surgery:** one change requires scattered edits; gather related behavior.
- **Divergent Change:** unrelated reasons change one module; separate responsibilities.
- **Speculative Generality:** abstraction for unrequested needs; consider removing it.
- **Message Chains:** callers navigate internal structure; hide the walk.
- **Middle Man:** a layer delegates without useful policy; consider direct access.
- **Refused Bequest:** an implementation rejects inherited behavior; consider composition.
