# 시지각 워크북 — 장면 숨은그림용 GPT 그림 요청문

작성 2026-10-19. C영역(전경-배경)의 새 유형 **장면 숨은그림** 에 쓸 그림입니다.
나머지 새 유형(위장 무늬, 겹친 그림 세기, 한 모양 따라 그리기, 글자 숲, 위치어, 종이 접기, 관점 바꾸기)은 프로그램이 직접 그리므로 그림이 필요 없습니다.

## 왜 "빈 장면 + 따로 그린 물건"으로 나누는가
- 물건이 처음부터 그려진 장면을 받으면 정답 위치를 사람이 일일이 표시해야 하고, 한 장면이 한 쪽밖에 안 됩니다.
- **물건이 없는 장면**과 **물건 그림**을 따로 받으면, 프로그램이 물건을 장면의 복잡한 곳에 작게·돌려서 숨기고 정답 좌표를 스스로 압니다. 장면 1장 × 물건 조합으로 쪽마다 다른 문제가 나오고, 단계(1~3)에 따라 물건 크기·회전·개수를 바꿀 수 있습니다.
- 그래서 장면과 물건은 **같은 선 굵기·같은 그림체**여야 숨겼을 때 티가 나지 않습니다.

---

## Codex 에게 한 번에 맡길 때 (이 블록을 그대로 붙여 넣기)

```
아래 요청문의 묶음 A(장면 12장)와 묶음 B(물건 30개)를 만들어 주세요.
- 한 장에 그림 하나씩. 장면은 1536×1024(가로), 물건은 1024×1024.
- 모든 그림은 흑백 선화(검은 선, 흰 바탕 #FFFFFF), 채색·회색 음영·그러데이션 없음.
- 글자, 숫자, 간판 글씨, 로고, 워터마크, 사람 얼굴 클로즈업 금지.
- 장면에는 묶음 B 목록의 물건을 그려 넣지 마세요. 어쩔 수 없이 비슷한 물건이 들어갔다면
  생성_목록.json 의 scenes[].similar 에 그 물건 id 를 적어 주세요(그 장면에서는 정답 후보에서 뺍니다).
- 물건은 배경 투명 PNG(안 되면 흰 바탕), 여백 최소, 선 굵기는 장면과 같게.
- 다 만든 뒤 스스로 검수: 선 굵기 차이, 회색/색 들어감, 글자 들어감, 물건이 장면에 이미 있음 → 다시 생성.
- 저장: 장면 → scenes/  물건 → hidden/  그리고 생성_목록.json (아래 형식).
```

`생성_목록.json` 형식:
```json
{
  "scenes": [ { "id": "k_playground", "file": "scenes/k_playground.png", "similar": [] } ],
  "objects": [ { "id": "spoon", "file": "hidden/spoon.png" } ]
}
```

---

## 묶음 A — 빈 장면 12장 (유아용 6, 청소년용 6)

**공통 문구 (모든 장면 문장 앞에 붙이기)**
> Black-and-white line-art illustration for a children's hidden-picture activity book. Clean uniform black outlines of medium weight (about 4 px at 1536 px width), pure white background, no fill colors, no gray shading, no hatching, no gradients. Dense but readable detail spread evenly across the whole picture — many small shapes, leaves, textures and patterns where small objects could hide. No text, letters, numbers, signs, logos or watermarks. No people's faces in close-up. Landscape 1536×1024.

**유아용 추가 문구**: `Friendly, simple, rounded cartoon style for ages 4–8. Large clear shapes, moderate detail.`
**청소년용 추가 문구**: `Semi-realistic illustration style for ages 10–18, not babyish. Higher detail and more complex textures.`

| id | 대상 | 장면 문장 (공통 문구 + 대상 문구 뒤에 붙이기) |
|---|---|---|
| k_playground | 유아 | A park playground with a slide, swings, sandbox, bushes, trees full of leaves and fluffy clouds. |
| k_kitchen | 유아 | A cozy kitchen with shelves of jars, pots, a table with a tablecloth pattern, a window with curtains and plants. |
| k_forest | 유아 | A forest clearing with big trees, mushrooms, flowers, tall grass, rocks and a small stream. |
| k_underwater | 유아 | An underwater scene with seaweed, coral, rocks, bubbles, shells and sand ripples (no fish). |
| k_bedroom | 유아 | A child's bedroom with a bed and patterned blanket, toy shelf, rug, window and wallpaper pattern. |
| k_farm | 유아 | A farmyard with a barn, fence, hay bales, a tractor, vegetable garden rows and trees. |
| t_library | 청소년 | A library interior with tall bookshelves, reading tables, lamps, potted plants and a patterned carpet. |
| t_street | 청소년 | A city street corner with shop fronts (no readable text), bicycles, benches, street trees and awnings. |
| t_camping | 청소년 | A campsite in the mountains with tents, a campfire, backpacks, pine trees, rocks and a lake. |
| t_market | 청소년 | A traditional outdoor market with stalls, baskets of produce, crates, hanging lanterns and awnings. |
| t_workshop | 청소년 | A craft workshop with a workbench, shelves of boxes, hanging tools pegboard, paint cans and wood planks. |
| t_station | 청소년 | A train station platform with benches, pillars, a roof structure, luggage, plants and tiled floor. |

> 장면에는 아래 묶음 B 의 물건(숟가락·열쇠·우산 등)을 **그리지 않도록** 하세요. 위 문장 끝에 `Do not draw any of these objects: spoon, key, umbrella, sock, banana, fish, star, cup, hammer, feather, button, hat, glove, bow, snail, leaf-shaped single leaf, bell, ring, toothbrush, comb, mushroom, paintbrush, paper clip, pushpin, glasses, bird, cat, shell, pencil, heart.` 를 붙여도 됩니다(숲 장면의 버섯·나뭇잎처럼 피할 수 없는 것은 similar 에 적기).

---

## 묶음 B — 숨길 물건 30개

**공통 문구**
> A single object as black-and-white line art, same style as a children's hidden-picture book: clean uniform black outlines (same stroke weight as the scenes), no fill, no shading, no text. Simple, instantly recognizable silhouette, centered, minimal margin, transparent background (or pure white). 1024×1024.

| id | 단어 | 문장 (공통 문구 뒤에 붙이기) |
|---|---|---|
| spoon | 숟가락 | A spoon, side view. |
| key | 열쇠 | An old-fashioned key. |
| umbrella | 우산 | An open umbrella with a curved handle. |
| sock | 양말 | A single sock. |
| banana | 바나나 | A single banana. |
| fish | 물고기 | A simple fish, side view. |
| star | 별 | A five-pointed star. |
| cup | 컵 | A cup with a handle. |
| hammer | 망치 | A hammer. |
| feather | 깃털 | A feather. |
| button | 단추 | A round button with four holes. |
| hat | 모자 | A brimmed hat. |
| glove | 장갑 | A single glove (mitten style). |
| bow | 리본 | A ribbon bow. |
| snail | 달팽이 | A snail with a spiral shell. |
| leaf | 나뭇잎 | A single leaf with veins. |
| bell | 종 | A small bell. |
| ring | 반지 | A ring with a small gem. |
| toothbrush | 칫솔 | A toothbrush. |
| comb | 빗 | A comb. |
| mushroom | 버섯 | A single mushroom. |
| paintbrush | 붓 | A paintbrush. |
| clip | 클립 | A paper clip. |
| pushpin | 압정 | A pushpin. |
| glasses | 안경 | A pair of glasses. |
| bird | 새 | A small bird, side view. |
| cat | 고양이 | A sitting cat, side view. |
| shell | 조개 | A scallop shell. |
| pencil | 연필 | A pencil. |
| heart | 하트 | A heart shape. |

---

## 받은 뒤 검수 기준 (Claude 가 확인)
1. **그림체 일치**: 장면과 물건을 같은 배율로 겹쳐 보아 선 굵기가 눈에 띄게 다르면 다시 요청(숨긴 물건이 튀어 보이면 과제가 안 됨).
2. **흑백 확인**: 픽셀 검사로 회색·색이 섞였는지 확인 → 회색은 문턱값으로 검정/흰색 처리.
3. **글자 없음**: 간판·책등에 글자 비슷한 것이 있으면 지우거나 제외.
4. **중복 물건**: 장면에 이미 그려진 비슷한 물건은 similar 로 정답 후보에서 뺌.
5. **흰 배경 제거**: 물건이 흰 바탕으로 오면 테두리에서 이어진 흰색만 투명 처리하고 여백을 자름.
6. **용량**: 인쇄 PDF 와 앱 용량을 위해 장면은 가로 1600 px 이하 PNG(흑백 2색) 또는 WebP 로 줄임.
7. 저장 위치: `D:\OT\앱\시지각워크북\icons\scenes\`, `D:\OT\앱\시지각워크북\icons\hidden\` (Codex 가 `Documents\Codex\...\outputs` 에 만들었으면 거기서 옮김).

## 프로그램 쪽 계획 (그림이 오면)
- 단계별: 1단계 물건 3개·크게·돌리지 않음 / 2단계 4개·중간·±30° / 3단계 6개·작게·자유 회전.
- 물건은 장면의 선이 빽빽한 곳(픽셀 밀도로 계산)에 놓고, 물건 자리의 장면 선을 살짝 지워 선이 이어져 보이게 함.
- 위쪽 "찾을 것" 띠에 물건 그림을 보여 주고, 앱에서는 숨긴 자리를 누르면 정답.
