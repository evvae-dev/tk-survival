# 이미지와 문맥 전체 점검

대상: 5.1의 20개 선택 장면과 56개 선택지. 판정·효과·분기·장수 능력 원자료는 변경하지 않았다.

## 수정 기준

- 황건적은 누런 두건으로 주인공과 동료를 구분하고 관군·관우·장비와 적으로 대치한다. 관군 편에서는 관우·장비가 아군이다.
- 추격/도주, 야습 준비/지원/돌격, 초병 깨우기/초소 경계를 구별했다.
- 항복 뒤 장면에는 묶인 포로와 칼을 든 관군을 표현하고, 성벽에서는 공격 측·방어 측을 구분했다.
- 광종 야습에 등장할 이유가 없는 유비를 새 야습대 이미지에서 제거했다.
- 현재 상황과 같은 그림 또는 선택지 간 같은 그림이 반복되면 팝업 전체를 텍스트만 표시한다.
- 상대가 없는 판정은 상대 문구를 표시하지 않는다. 상대가 있으면 판정에 쓰는 실제 능력값을 표시한다. 관우 무력은 현재 자료상 97, 장비는 98이다.

## 20개 상황·팝업 확인

| 사건 | 선택 노드 | 상황 이미지 | 팝업 |
| --- | --- | --- | --- |
| chapter-5-1-opening | side | `/art/scenes/opening.png` | 서로 다른 이미지 3개 |
| chapter-5-1-opening | front | `/art/choices/travel-wagons.png` | 텍스트만 |
| battle-184-daxingshan | han-plan | `/art/choices/han-daxing.png` | 서로 다른 이미지 3개 |
| battle-184-daxingshan | yellow-plan | `/art/choices/yellow-face-generals.png` | 서로 다른 이미지 3개 |
| battle-184-daxingshan | civilian | `/art/choices/relief.png` | 텍스트만 |
| battle-184-qingzhou-city | han-plan | `/art/choices/han-ambush.png` | 텍스트만 |
| battle-184-qingzhou-city | yellow-plan | `/art/choices/yellow-stop.png` | 텍스트만 |
| battle-184-qingzhou-city | civilian | `/art/choices/relief.png` | 텍스트만 |
| battle-184-wan | han-plan | `/art/choices/han-assault.png` | 텍스트만 |
| battle-184-wan | surrender | `/art/choices/han-prisoners-protest.png` | 텍스트만 |
| battle-184-wan | yellow-plan | `/art/choices/yellow-supplies.png` | 텍스트만 |
| battle-184-wan | civilian | `/art/choices/relief.png` | 텍스트만 |
| battle-184-guangzong | han-plan | `/art/choices/official.png` | 텍스트만 |
| battle-184-guangzong | night | `/art/choices/han-night-wait.png` | 서로 다른 이미지 2개 |
| battle-184-guangzong | yellow-plan | `/art/choices/yellow-night-watch.png` | 서로 다른 이미지 3개 |
| battle-184-guangzong | civilian | `/art/choices/relief.png` | 텍스트만 |
| battle-184-xiaquyang | han-plan | `/art/scenes/siege.png` | 서로 다른 이미지 3개 |
| battle-184-xiaquyang | yellow-plan | `/art/choices/yellow-city.png` | 서로 다른 이미지 3개 |
| battle-184-xiaquyang | civilian | `/art/choices/relief.png` | 텍스트만 |
| chapter-5-1-closing | record | `/art/choices/porridge.png` | 텍스트만 |

## 56개 선택지의 행동 대조

| 사건 / 노드 | 행동 | 점검한 그림의 의미 | 팝업 표시 |
| --- | --- | --- | --- |
| chapter-5-1-opening / side | [관군에 붙는다] | 관군 병사들에게 다가가는 주인공 (`han.png`) | 이미지 표시 |
| chapter-5-1-opening / side | [황건적 코스프레] | 누런 두건으로 황건적 사이에 섞이는 주인공 (`yellow.png`) | 이미지 표시 |
| chapter-5-1-opening / side | [냅다 도망친다] | 골목으로 달아나는 주인공 (`run.png`) | 이미지 표시 |
| chapter-5-1-opening / front | [탁군으로 간다] | 주인공이 세 갈래 길에서 탁군으로 떠나는 수레를 고른다 (`travel-wagons.png`) | 텍스트만 |
| chapter-5-1-opening / front | [완성으로 간다] | 주인공이 세 갈래 길에서 완성으로 떠나는 수레를 고른다 (`travel-wagons.png`) | 텍스트만 |
| chapter-5-1-opening / front | [광종으로 간다] | 주인공이 세 갈래 길에서 광종으로 떠나는 수레를 고른다 (`travel-wagons.png`) | 텍스트만 |
| battle-184-daxingshan / han-plan | [등무와 맞붙는다] | 죽창을 들고 황건적과 맞서는 주인공 (`duel.png`) | 이미지 표시 |
| battle-184-daxingshan / han-plan | [퇴로를 막는다] | 좁은 길의 퇴로를 막는 주인공 (`block.png`) | 이미지 표시 |
| battle-184-daxingshan / han-plan | [유비군을 따라간다] | 유비와 군대를 따라가는 주인공 (`follow.png`) | 이미지 표시 |
| battle-184-daxingshan / yellow-plan | [좁은 길로 유인한다] | 누런 두건의 주인공이 적인 관우·장비를 좁은 길로 유인한다 (`yellow-lure.png`) | 이미지 표시 |
| battle-184-daxingshan / yellow-plan | [퇴로를 확보한다] | 누런 두건의 주인공이 황건적 동료들의 퇴로를 열고 관군을 피한다 (`yellow-retreat.png`) | 이미지 표시 |
| battle-184-daxingshan / yellow-plan | [진형을 지킨다] | 누런 두건의 주인공이 황건적 진형에서 적인 관우·장비와 맞선다 (`yellow-formation.png`) | 이미지 표시 |
| battle-184-daxingshan / civilian | [피란민을 이끈다] | 피란민과 함께 길을 나서는 주인공 (`relief.png`) | 텍스트만 |
| battle-184-daxingshan / civilian | [남은 물자를 찾는다] | 수레의 곡식 자루를 살펴보는 주인공 (`supplies.png`) | 텍스트만 |
| battle-184-daxingshan / civilian | [창고에 숨는다] | 나무 창고에 몸을 숨긴 주인공 (`hide.png`) | 텍스트만 |
| battle-184-qingzhou-city / han-plan | [매복 신호를 보낸다] | 관군 편 주인공이 아군 관우·장비와 수풀에 숨어 황건적을 향한 매복 신호를 보낸다 (`han-ambush.png`) | 텍스트만 |
| battle-184-qingzhou-city / han-plan | [성문까지 길을 뚫는다] | 주인공이 관군 병사들과 방패를 들고 황건적이 지키는 성벽 아래로 진격한다 (`han-assault.png`) | 텍스트만 |
| battle-184-qingzhou-city / han-plan | [유비를 따라 물러난다] | 주인공이 아군 유비와 함께 물러나며 뒤쫓는 황건적을 유인한다 (`han-retreat.png`) | 텍스트만 |
| battle-184-qingzhou-city / yellow-plan | [추격을 멈춘다] | 누런 두건의 주인공이 황건적 동료들의 추격을 멈추고 적 유비군과 수풀을 살핀다 (`yellow-stop.png`) | 텍스트만 |
| battle-184-qingzhou-city / yellow-plan | [성문을 막는다] | 누런 두건의 주인공이 관군의 진입을 막으려고 성문을 닫는다 (`yellow-gate.png`) | 텍스트만 |
| battle-184-qingzhou-city / yellow-plan | [끝까지 추격한다] | 누런 두건의 주인공이 황건적 동료들과 함께 앞서 물러나는 관군을 추격한다 (`yellow-pursue.png`) | 텍스트만 |
| battle-184-qingzhou-city / civilian | [피란민을 이끈다] | 피란민과 함께 길을 나서는 주인공 (`relief.png`) | 텍스트만 |
| battle-184-qingzhou-city / civilian | [남은 물자를 찾는다] | 수레의 곡식 자루를 살펴보는 주인공 (`supplies.png`) | 텍스트만 |
| battle-184-qingzhou-city / civilian | [창고에 숨는다] | 나무 창고에 몸을 숨긴 주인공 (`hide.png`) | 텍스트만 |
| battle-184-wan / han-plan | [돌격대를 이끈다] | 주인공이 관군 돌격대와 방패를 맞추고 황건적 성벽 아래로 진격한다 (`han-assault.png`) | 텍스트만 |
| battle-184-wan / han-plan | [한충과 협상한다] | 황건적 지휘관과 대화하는 주인공 (`negotiate.png`) | 텍스트만 |
| battle-184-wan / han-plan | [토벌군 명령을 따른다] | 주인공이 관군의 명령에 따라 방패를 머리 위로 들고 성벽 아래에서 움직인다 (`han-assault.png`) | 텍스트만 |
| battle-184-wan / surrender | [처형을 막는다] | 주인공이 묶인 황건적 포로와 칼을 든 관군 사이에서 처형을 막는다 (`han-prisoners-protest.png`) | 텍스트만 |
| battle-184-wan / surrender | [진힐에게 맡긴다] | 주인공이 끼어들지 못한 채 관군이 묶인 황건적 포로를 맡아가는 모습을 지켜본다 (`han-prisoners-witness.png`) | 텍스트만 |
| battle-184-wan / yellow-plan | [방어와 보급을 정리한다] | 누런 두건의 주인공이 황건적 성벽 안에서 보급 자루와 방어 배치를 정리한다 (`yellow-supplies.png`) | 텍스트만 |
| battle-184-wan / yellow-plan | [작은 문으로 대피시킨다] | 누런 두건의 주인공이 황건적 동료들과 주민을 작은 문으로 대피시킨다 (`yellow-evacuate.png`) | 텍스트만 |
| battle-184-wan / yellow-plan | [성벽에서 버틴다] | 누런 두건의 주인공이 성벽 위에서 올라오는 관군의 사다리를 밀어낸다 (`yellow-wall.png`) | 텍스트만 |
| battle-184-wan / civilian | [피란민을 이끈다] | 피란민과 함께 길을 나서는 주인공 (`relief.png`) | 텍스트만 |
| battle-184-wan / civilian | [남은 물자를 찾는다] | 수레의 곡식 자루를 살펴보는 주인공 (`supplies.png`) | 텍스트만 |
| battle-184-wan / civilian | [창고에 숨는다] | 나무 창고에 몸을 숨긴 주인공 (`hide.png`) | 텍스트만 |
| battle-184-guangzong / han-plan | [노식의 공적을 알린다] | 관리에게 노식의 공적을 설명하는 주인공 (`official.png`) | 텍스트만 |
| battle-184-guangzong / han-plan | [야습 준비를 돕는다] | 주인공이 관군 편에서 황건적 목책을 넘을 밧줄과 사다리를 준비한다 (`han-night-prepare.png`) | 텍스트만 |
| battle-184-guangzong / han-plan | [새 명령을 따른다] | 관군 병사들에게 명령을 듣는 주인공 (`han.png`) | 텍스트만 |
| battle-184-guangzong / night | [야습대를 이끈다] | 주인공이 관군 야습대의 맨 앞에서 황건적 군영을 향해 돌진한다 (`han-night-lead.png`) | 이미지 표시 |
| battle-184-guangzong / night | [뒤에서 작전을 돕는다] | 주인공이 관군 후방에서 밧줄을 당기며 황건적 목책을 넘는 아군을 돕는다 (`han-night-support.png`) | 이미지 표시 |
| battle-184-guangzong / yellow-plan | [초병을 깨운다] | 누런 두건의 주인공이 잠든 황건적 초병을 다급하게 깨운다 (`yellow-sentry.png`) | 이미지 표시 |
| battle-184-guangzong / yellow-plan | [장량의 퇴로를 만든다] | 누런 두건의 주인공이 황건적 동료들이 관군을 피해 빠져나갈 문을 확보한다 (`yellow-retreat.png`) | 이미지 표시 |
| battle-184-guangzong / yellow-plan | [맡은 초소를 지킨다] | 누런 두건의 주인공이 잠들지 않고 황건적 목책의 초소를 지킨다 (`yellow-guard.png`) | 이미지 표시 |
| battle-184-guangzong / civilian | [피란민을 이끈다] | 피란민과 함께 길을 나서는 주인공 (`relief.png`) | 텍스트만 |
| battle-184-guangzong / civilian | [남은 물자를 찾는다] | 수레의 곡식 자루를 살펴보는 주인공 (`supplies.png`) | 텍스트만 |
| battle-184-guangzong / civilian | [창고에 숨는다] | 나무 창고에 몸을 숨긴 주인공 (`hide.png`) | 텍스트만 |
| battle-184-xiaquyang / han-plan | [포위망을 지휘한다] | 지도에서 포위망을 점검하는 주인공 (`strategy.png`) | 이미지 표시 |
| battle-184-xiaquyang / han-plan | [장보에게 항복을 권한다] | 황건적 지휘관에게 대화를 청하는 주인공 (`negotiate.png`) | 이미지 표시 |
| battle-184-xiaquyang / han-plan | [황보숭을 따라 진격한다] | 관군과 함께 진격하는 주인공 (`formation.png`) | 이미지 표시 |
| battle-184-xiaquyang / yellow-plan | [포위선을 돌파한다] | 누런 두건의 주인공이 황건적 동료들을 이끌고 관군의 얇은 포위선을 뚫는다 (`yellow-breakout.png`) | 이미지 표시 |
| battle-184-xiaquyang / yellow-plan | [장보와 주민을 대피시킨다] | 누런 두건의 주인공이 황건적 지휘관과 주민들의 수레를 성 밖으로 대피시킨다 (`yellow-evacuate.png`) | 이미지 표시 |
| battle-184-xiaquyang / yellow-plan | [성벽에서 맞선다] | 누런 두건의 주인공이 황건적 성벽 위에서 아래의 관군과 맞선다 (`yellow-wall.png`) | 이미지 표시 |
| battle-184-xiaquyang / civilian | [피란민을 이끈다] | 피란민과 함께 길을 나서는 주인공 (`relief.png`) | 텍스트만 |
| battle-184-xiaquyang / civilian | [남은 물자를 찾는다] | 수레의 곡식 자루를 살펴보는 주인공 (`supplies.png`) | 텍스트만 |
| battle-184-xiaquyang / civilian | [창고에 숨는다] | 나무 창고에 몸을 숨긴 주인공 (`hide.png`) | 텍스트만 |
| chapter-5-1-closing / record | [죽부터 먹는다] | 모닥불 앞에서 죽을 먹는 주인공 (`porridge.png`) | 텍스트만 |

## 검증

- Playwright: 데스크톱 1440×1000, 모바일 390×844, 낮은 화면 1440×720에서 총 60개 장면·168개 선택지 렌더링을 확인했다.
- 전체 장면의 이미지 로드, 팝업 중복 이미지 부재, 상대 없음 문구 부재, 상대 실제 능력값 표시, 가로 넘침 부재를 확인했다.
- 처음 시작은 화면의 입력 폼으로 진행하고, 이후 전 장면 검증은 별도 테스트 브라우저의 저장 데이터만 구성했다. 사용자의 실제 저장 데이터는 변경하지 않았다.
- 단위 테스트 119개, 타입 검사, 클라우드용 빌드 통과.
- 재검증: `.agents/skills/playwright-page-check/scripts/audit-tk-images.cjs`. 스크린샷·JSON은 `/tmp/tk-image-audit/`에 저장한다.
