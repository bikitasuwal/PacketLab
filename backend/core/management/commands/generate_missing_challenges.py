from django.core.management.base import BaseCommand
from core.models import Lab, Challenge
from core.ai_explainer import generate_challenges_for_lab


class Command(BaseCommand):
    help = 'Generate AI challenges for labs that have packets but no challenges'

    def handle(self, *args, **options):
        labs = Lab.objects.all()
        count = 0

        for lab in labs:
            if lab.challenges.count() > 0:
                continue

            packet_count = lab.packets.count()
            if packet_count == 0:
                self.stdout.write(self.style.WARNING(f'Skipping "{lab.title}" (no packets)'))
                continue

            self.stdout.write(f'Generating challenges for "{lab.title}" ({packet_count} packets)...')

            try:
                generated = generate_challenges_for_lab(lab)
                for item in generated:
                    Challenge.objects.create(
                        lab=lab,
                        order=lab.challenges.count() + 1,
                        question=item['question'],
                        correct_answer=item['correct_answer'],
                    )
                self.stdout.write(self.style.SUCCESS(f'  Created {len(generated)} challenges'))
                count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Failed: {e}'))

        self.stdout.write(self.style.SUCCESS(f'\nDone! Generated challenges for {count} labs'))
